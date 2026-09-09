"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input, FieldNote } from "@/components/ui/field";
import { Label } from "@/components/ui/card";

/**
 * Login and sign-up share one component because they share one shape: the same
 * fields, the same Google button, the same error surface. The only real
 * difference is that sign-up creates the account first, then signs in with the
 * credentials it just created, so a new user never has to type them twice.
 */
export function AuthForm({
  mode,
  googleEnabled,
}: {
  mode: "login" | "signup";
  googleEnabled: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(
    params.get("error") ? "That sign-in didn't work. Try again." : null,
  );
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const callbackUrl = params.get("callbackUrl") ?? "/dashboard";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      if (isSignup) {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          setError(body?.error ?? "We couldn't create that account.");
          return;
        }
      }

      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        setError("That email and password don't match an account.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("We couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-slate-100">
        {isSignup ? "Start your free trial" : "Log in"}
      </h1>
      <p className="mt-1 text-sm text-slate-400">
        {isSignup
          ? "Three days free. No card until day four."
          : "Welcome back."}
      </p>

      {googleEnabled ? (
        <>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="mt-6 w-full"
            disabled={busy}
            onClick={() => void signIn("google", { callbackUrl })}
          >
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-navy-800" />
            or
            <span className="h-px flex-1 bg-navy-800" />
          </div>
        </>
      ) : null}

      <form onSubmit={submit} className={googleEnabled ? "space-y-4" : "mt-6 space-y-4"}>
        {isSignup ? (
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              value={values.name}
              onChange={(event) => setValues((v) => ({ ...v, name: event.target.value }))}
              className="mt-2"
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={values.email}
            onChange={(event) => setValues((v) => ({ ...v, email: event.target.value }))}
            className="mt-2"
          />
        </div>

        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            minLength={isSignup ? 10 : undefined}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={values.password}
            onChange={(event) => setValues((v) => ({ ...v, password: event.target.value }))}
            className="mt-2"
          />
          {isSignup ? <FieldNote>At least 10 characters.</FieldNote> : null}
        </div>

        {error ? <FieldNote tone="error">{error}</FieldNote> : null}

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? "Just a moment…" : isSignup ? "Start free trial" : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-500">
              Log in
            </Link>
          </>
        ) : (
          <>
            No account yet?{" "}
            <Link href="/signup" className="text-blue-400 hover:text-blue-500">
              Start a free trial
            </Link>
          </>
        )}
      </p>

      {isSignup ? (
        <p className="prose-measure mt-6 text-xs leading-relaxed text-slate-400">
          By creating an account you confirm you are 18 or older and accept our{" "}
          <Link href="/terms" className="text-slate-100 underline">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-slate-100 underline">
            privacy policy
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
