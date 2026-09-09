-- OddScope — schema, row-level security, and the rules the browser cannot talk
-- its way around.
--
-- This app runs entirely in the browser against PostgREST, so "validate it on
-- the server" means "validate it in the database". Three things are therefore
-- enforced here rather than in JavaScript:
--
--   1. Profit and loss is a GENERATED column. The client cannot write it; it
--      falls out of the outcome, the stake and the price. Arithmetic that the
--      database computes cannot be argued with.
--   2. A trigger reverts every column of a recommendation except the outcome,
--      so marking a bet won cannot quietly also rewrite the odds it was struck
--      at, and the 24-hour edit window is real rather than a hidden button.
--   3. Billing columns on a profile are reverted for anyone who is not the
--      service role, so a user cannot set their own plan to ACTIVE.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------

create type plan_tier       as enum ('TRIAL', 'ACTIVE', 'EXPIRED');
create type analysis_status as enum ('PROCESSING', 'PENDING', 'SETTLED', 'FAILED');
create type risk_tier       as enum ('SAFE', 'BALANCED', 'AGGRESSIVE');
create type bet_outcome     as enum ('UNMARKED', 'WON', 'LOST', 'VOID');

-- ---------------------------------------------------------------------------
-- Profiles — one row per auth.users row
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                     uuid primary key references auth.users on delete cascade,
  email                  text not null,
  name                   text,

  -- Billing. Written only by the Whop webhook, running as service_role.
  plan                   plan_tier not null default 'TRIAL',
  trial_ends_at          timestamptz,
  subscription_ends_at   timestamptz,
  whop_membership_id     text unique,
  whop_user_id           text,

  -- Staking preferences
  bankroll               numeric,
  stake_unit_size        numeric default 10,
  currency               text not null default 'ZAR',

  -- The user's own cap on themselves. Null means no cap.
  monthly_analysis_limit integer,

  -- Timestamp of the one-time risk acknowledgement. Null => show the modal.
  risk_acknowledged_at   timestamptz,

  created_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Analyses
-- ---------------------------------------------------------------------------

create table public.analyses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  screenshot_url   text,
  user_notes       text,

  home_team        text not null default '',
  away_team        text not null default '',
  competition      text,
  kickoff          timestamptz,
  bookmaker        text,

  -- Verbatim output of the extraction call, kept so a pipeline change can be
  -- replayed against past screenshots without re-reading the image.
  raw_extraction   jsonb not null default '{}'::jsonb,
  match_summary    text,
  bookmaker_margin numeric,

  -- Populated only when status is FAILED — shown to the user as written.
  failure_reason   text,

  status           analysis_status not null default 'PENDING',
  created_at       timestamptz not null default now()
);

create index analyses_user_created_idx on public.analyses (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Recommendations
-- ---------------------------------------------------------------------------

create table public.recommendations (
  id                 uuid primary key default gen_random_uuid(),
  analysis_id        uuid not null references public.analyses(id) on delete cascade,
  tier               risk_tier not null,

  -- When true every field below is null: no positive edge was found in this
  -- tier and none was invented. This is a result, not an absence.
  no_value           boolean not null default false,

  market             text,
  selection          text,
  odds               numeric,
  model_probability  numeric,
  stake_units        numeric,
  stake_amount       numeric,
  rationale          text,

  -- Derived, never written. The bookmaker's implied probability is 1/odds and
  -- the edge is (probability x odds) - 1; storing them as generated columns
  -- means no code path anywhere can persist a number that disagrees.
  implied_probability numeric generated always as (
    case when odds > 1 then 1 / odds end
  ) stored,

  edge_percent numeric generated always as (
    case when odds > 1 and model_probability is not null
         then model_probability * odds - 1 end
  ) stored,

  outcome            bet_outcome not null default 'UNMARKED',
  settled_at         timestamptz,

  -- A won bet returns the stake plus winnings, so the profit is the winnings
  -- alone. A void is a refund: zero, and excluded from strike rate elsewhere.
  profit_loss numeric generated always as (
    case
      when outcome = 'WON'::bet_outcome  then stake_units * (odds - 1)
      when outcome = 'LOST'::bet_outcome then -stake_units
      when outcome = 'VOID'::bet_outcome then 0
    end
  ) stored
);

create index recommendations_analysis_idx on public.recommendations (analysis_id);

-- ---------------------------------------------------------------------------
-- New signups get a profile and a three-day trial
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, plan, trial_ends_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
    'TRIAL',
    now() + interval '3 days'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- A user may edit their preferences, never their billing
-- ---------------------------------------------------------------------------

create or replace function public.lock_billing_columns()
returns trigger
language plpgsql
as $$
begin
  -- The Whop webhook connects as service_role and is the only writer allowed
  -- to move a plan. Everyone else gets the old values put back silently.
  if current_user = 'service_role' then
    return new;
  end if;

  new.id                   := old.id;
  new.email                := old.email;
  new.plan                 := old.plan;
  new.trial_ends_at        := old.trial_ends_at;
  new.subscription_ends_at := old.subscription_ends_at;
  new.whop_membership_id   := old.whop_membership_id;
  new.whop_user_id         := old.whop_user_id;
  new.created_at           := old.created_at;
  return new;
end;
$$;

create trigger profiles_lock_billing
  before update on public.profiles
  for each row execute function public.lock_billing_columns();

-- ---------------------------------------------------------------------------
-- Settling a bet: outcome is the only thing a user may change
-- ---------------------------------------------------------------------------

create or replace function public.guard_recommendation_update()
returns trigger
language plpgsql
as $$
begin
  if current_user = 'service_role' then
    return new;
  end if;

  -- Everything that describes the bet is fixed at the moment it was struck.
  new.analysis_id       := old.analysis_id;
  new.tier              := old.tier;
  new.no_value          := old.no_value;
  new.market            := old.market;
  new.selection         := old.selection;
  new.odds              := old.odds;
  new.model_probability := old.model_probability;
  new.stake_units       := old.stake_units;
  new.stake_amount      := old.stake_amount;
  new.rationale         := old.rationale;

  if old.no_value then
    raise exception 'There is no bet to settle on a tier we told you to skip.';
  end if;

  -- Editable for 24 hours, then final. People mistype in the moment; a history
  -- you can rewrite indefinitely is not a history.
  if old.settled_at is not null and now() - old.settled_at > interval '24 hours' then
    raise exception 'This result was marked more than 24 hours ago and is now final.';
  end if;

  -- Undoing clears the timestamp, which restarts the window if it is marked
  -- again. That is intended: an undo inside the window should not leave the
  -- row half-locked.
  if new.outcome = 'UNMARKED'::bet_outcome then
    new.settled_at := null;
  else
    new.settled_at := coalesce(old.settled_at, now());
  end if;

  return new;
end;
$$;

create trigger recommendations_guard_update
  before update on public.recommendations
  for each row execute function public.guard_recommendation_update();

-- An analysis is settled once every actionable recommendation has an outcome.
-- No-value tiers are not actionable and are never waited on.
create or replace function public.sync_analysis_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actionable integer;
  unmarked   integer;
begin
  select count(*) filter (where not no_value),
         count(*) filter (where not no_value and outcome = 'UNMARKED'::bet_outcome)
    into actionable, unmarked
    from public.recommendations
   where analysis_id = new.analysis_id;

  update public.analyses
     set status = case
                    when actionable = 0 or unmarked = 0 then 'SETTLED'::analysis_status
                    else 'PENDING'::analysis_status
                  end
   where id = new.analysis_id
     and status in ('PENDING'::analysis_status, 'SETTLED'::analysis_status);

  return null;
end;
$$;

create trigger recommendations_sync_status
  after update of outcome on public.recommendations
  for each row execute function public.sync_analysis_status();

-- ---------------------------------------------------------------------------
-- Row-level security
--
-- The anon key is public by design; these policies are what make that safe.
-- Every table denies everything by default, and each policy below opens the
-- narrowest hole that the app actually needs.
-- ---------------------------------------------------------------------------

alter table public.profiles        enable row level security;
alter table public.analyses        enable row level security;
alter table public.recommendations enable row level security;

create policy profiles_select_own on public.profiles
  for select using ((select auth.uid()) = id);

create policy profiles_update_own on public.profiles
  for update using ((select auth.uid()) = id)
              with check ((select auth.uid()) = id);

-- Analyses are created by the Edge Function, never by the browser: writing one
-- costs money, so the decision to write one has to happen behind the key.
create policy analyses_select_own on public.analyses
  for select using ((select auth.uid()) = user_id);

create policy analyses_delete_own on public.analyses
  for delete using ((select auth.uid()) = user_id);

create policy recommendations_select_own on public.recommendations
  for select using (
    exists (
      select 1 from public.analyses a
       where a.id = recommendations.analysis_id
         and a.user_id = (select auth.uid())
    )
  );

create policy recommendations_update_own on public.recommendations
  for update using (
    exists (
      select 1 from public.analyses a
       where a.id = recommendations.analysis_id
         and a.user_id = (select auth.uid())
    )
  );
