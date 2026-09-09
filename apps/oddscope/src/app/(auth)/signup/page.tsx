import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Start your free trial" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  return (
    <Suspense>
      <AuthForm mode="signup" googleEnabled={env.googleEnabled} />
    </Suspense>
  );
}
