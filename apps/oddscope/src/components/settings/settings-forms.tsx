"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Select, FieldNote } from "@/components/ui/field";
import { Card, CardBody, CardHeader, Label, SectionTitle } from "@/components/ui/card";
import { SUPPORTED_CURRENCIES, currencySymbol } from "@/lib/format";

type Status = { tone: "ok" | "error"; message: string } | null;

function useSaver() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(null);
  const [saving, setSaving] = useState(false);

  async function save(url: string, body: unknown, successMessage: string) {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch(url, {
        method: url.endsWith("/password") ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setStatus({ tone: "error", message: payload?.error ?? "We couldn't save that." });
        return false;
      }
      setStatus({ tone: "ok", message: successMessage });
      router.refresh();
      return true;
    } catch {
      setStatus({ tone: "error", message: "We couldn't reach the server." });
      return false;
    } finally {
      setSaving(false);
    }
  }

  return { save, status, saving };
}

function StatusNote({ status }: { status: Status }) {
  if (!status) return null;
  return <FieldNote tone={status.tone === "error" ? "error" : "neutral"}>{status.message}</FieldNote>;
}

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [value, setValue] = useState(name);
  const { save, status, saving } = useSaver();

  return (
    <Card>
      <CardHeader>
        <SectionTitle>Profile</SectionTitle>
      </CardHeader>
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save("/api/settings", { name: value }, "Saved.");
          }}
        >
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-2"
              maxLength={120}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} readOnly disabled className="mt-2" />
            <FieldNote>Your email is how your Whop subscription finds this account.</FieldNote>
          </div>

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save profile"}
            </Button>
          </div>
          <StatusNote status={status} />
        </form>
      </CardBody>
    </Card>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const { save, status, saving } = useSaver();

  return (
    <Card>
      <CardHeader>
        <SectionTitle>{hasPassword ? "Change password" : "Set a password"}</SectionTitle>
      </CardHeader>
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await save(
              "/api/settings/password",
              hasPassword
                ? { currentPassword: current, newPassword: next }
                : { newPassword: next },
              "Password updated.",
            );
            if (ok) {
              setCurrent("");
              setNext("");
            }
          }}
        >
          {hasPassword ? (
            <div>
              <Label htmlFor="current-password">Current password</Label>
              <Input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(event) => setCurrent(event.target.value)}
                className="mt-2"
              />
            </div>
          ) : (
            <FieldNote>
              You signed up with Google. Setting a password lets you log in either way.
            </FieldNote>
          )}

          <div>
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className="mt-2"
              minLength={10}
            />
            <FieldNote>At least 10 characters.</FieldNote>
          </div>

          <Button type="submit" disabled={saving || next.length < 10}>
            {saving ? "Saving…" : hasPassword ? "Change password" : "Set password"}
          </Button>
          <StatusNote status={status} />
        </form>
      </CardBody>
    </Card>
  );
}

export function StakingForm({
  bankroll,
  stakeUnitSize,
  currency,
}: {
  bankroll: number | null;
  stakeUnitSize: number | null;
  currency: string;
}) {
  const [values, setValues] = useState({
    bankroll: bankroll?.toString() ?? "",
    stakeUnitSize: stakeUnitSize?.toString() ?? "",
    currency,
  });
  const { save, status, saving } = useSaver();

  const symbol = currencySymbol(values.currency);

  return (
    <Card>
      <CardHeader>
        <SectionTitle>Staking</SectionTitle>
      </CardHeader>
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save(
              "/api/settings",
              {
                bankroll: values.bankroll === "" ? null : Number(values.bankroll),
                stakeUnitSize:
                  values.stakeUnitSize === "" ? null : Number(values.stakeUnitSize),
                currency: values.currency,
              },
              "Saved.",
            );
          }}
        >
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              id="currency"
              value={values.currency}
              onChange={(event) =>
                setValues((v) => ({ ...v, currency: event.target.value }))
              }
              className="mt-2"
            >
              {SUPPORTED_CURRENCIES.map((code) => (
                <option key={code} value={code}>
                  {code} ({currencySymbol(code).trim()})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="bankroll">Bankroll</Label>
            <Input
              id="bankroll"
              type="number"
              min={0}
              step="0.01"
              numeric
              value={values.bankroll}
              onChange={(event) => setValues((v) => ({ ...v, bankroll: event.target.value }))}
              placeholder="0"
              className="mt-2"
            />
            <FieldNote>
              The total you are prepared to risk. Used for context, never spent.
            </FieldNote>
          </div>

          <div>
            <Label htmlFor="unit">Stake unit size</Label>
            <Input
              id="unit"
              type="number"
              min={0.01}
              step="0.01"
              numeric
              value={values.stakeUnitSize}
              onChange={(event) =>
                setValues((v) => ({ ...v, stakeUnitSize: event.target.value }))
              }
              placeholder="10"
              className="mt-2"
            />
            <FieldNote>
              One unit is {symbol}
              {values.stakeUnitSize || "10"}. A pick sized at 1.4 units means{" "}
              {symbol}
              {(Number(values.stakeUnitSize || 10) * 1.4).toFixed(2)}. Recommendations are
              capped at three units.
            </FieldNote>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save staking"}
          </Button>
          <StatusNote status={status} />
        </form>
      </CardBody>
    </Card>
  );
}

export function ResponsibleUseForm({
  monthlyAnalysisLimit,
  usedThisMonth,
}: {
  monthlyAnalysisLimit: number | null;
  usedThisMonth: number;
}) {
  const [limit, setLimit] = useState(monthlyAnalysisLimit?.toString() ?? "");
  const { save, status, saving } = useSaver();

  return (
    <Card>
      <CardHeader>
        <SectionTitle>Responsible use</SectionTitle>
      </CardHeader>
      <CardBody>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void save(
              "/api/settings",
              { monthlyAnalysisLimit: limit === "" ? null : Number(limit) },
              limit === "" ? "Limit removed." : "Limit saved.",
            );
          }}
        >
          <p className="prose-measure text-sm leading-relaxed text-slate-400">
            You can cap how many analyses you run in a calendar month. Once you reach it,
            new analyses are blocked until the month rolls over. Your history and settings
            stay open.
          </p>

          <div>
            <Label htmlFor="limit">Monthly analysis limit</Label>
            <Input
              id="limit"
              type="number"
              min={1}
              step={1}
              numeric
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              placeholder="No limit"
              className="mt-2"
            />
            <FieldNote>
              <span className="tabular">{usedThisMonth}</span> used this month. Leave blank
              for no limit.
            </FieldNote>
          </div>

          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save limit"}
          </Button>
          <StatusNote status={status} />
        </form>
      </CardBody>
    </Card>
  );
}
