import { Plan, type User } from "@prisma/client";

/** Three days, full access, no card. */
export const TRIAL_DAYS = 3;

export function trialEndDate(from: Date = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

type PlanFields = Pick<User, "plan" | "trialEndsAt" | "subscriptionEndsAt">;

/**
 * Whether this account may run a new analysis.
 *
 * ACTIVE is honoured until subscriptionEndsAt passes — a user who cancels
 * mid-cycle keeps what they paid for. TRIAL is honoured until trialEndsAt.
 * EXPIRED is always closed.
 */
export function hasAnalysisAccess(user: PlanFields, now: Date = new Date()): boolean {
  switch (user.plan) {
    case Plan.ACTIVE:
      return !user.subscriptionEndsAt || user.subscriptionEndsAt > now;
    case Plan.TRIAL:
      return Boolean(user.trialEndsAt && user.trialEndsAt > now);
    case Plan.EXPIRED:
      return false;
  }
}

export function isTrialing(user: PlanFields, now: Date = new Date()): boolean {
  return user.plan === Plan.TRIAL && Boolean(user.trialEndsAt && user.trialEndsAt > now);
}

/** Why access was refused, phrased for the upgrade screen. */
export function accessDenialReason(user: PlanFields, now: Date = new Date()): string | null {
  if (hasAnalysisAccess(user, now)) return null;
  if (user.plan === Plan.TRIAL) return "Your three-day trial has ended.";
  if (user.plan === Plan.ACTIVE) return "Your subscription period has ended.";
  return "Your subscription is no longer active.";
}

// The JWT-snapshot equivalent of hasAnalysisAccess lives in lib/access-token,
// which middleware can import without pulling in the Prisma client.
export { hasAnalysisAccessFromToken } from "./access-token";
