import type { Plan } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      /** Snapshot refreshed at most once a minute — never the billing authority. */
      plan: Plan;
      trialEndsAt: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    plan: Plan;
    trialEndsAt: string | null;
    planCheckedAt: number;
  }
}
