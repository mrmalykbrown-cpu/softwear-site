import { PrismaAdapter } from "@next-auth/prisma-adapter";
import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { Plan } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "./env";
import { TRIAL_DAYS, trialEndDate } from "./plan";

/**
 * The plan snapshot inside the JWT is refreshed at most this often. It exists
 * only so middleware — which runs on the edge and cannot reach the database —
 * can make a fast redirect decision. Every gate that actually matters re-reads
 * the User row, so a stale snapshot can delay a change by up to a minute but
 * can never grant or deny access on its own.
 */
const PLAN_SNAPSHOT_TTL_MS = 60_000;

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email?.trim().toLowerCase();
      const password = credentials?.password;
      if (!email || !password) return null;

      const user = await prisma.user.findUnique({ where: { email } });
      // An account created through Google has no password hash. Comparing
      // against a dummy hash anyway keeps the response time of "no such user"
      // and "wrong password" indistinguishable.
      const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinva";
      const ok = await bcrypt.compare(password, hash);
      if (!user || !user.passwordHash || !ok) return null;

      return { id: user.id, email: user.email, name: user.name, image: user.image };
    },
  }),
];

if (env.googleEnabled) {
  providers.push(
    GoogleProvider({
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  // JWT sessions are required: the credentials provider cannot issue a database
  // session in NextAuth v4, and middleware needs a token it can verify on edge.
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/login", error: "/login" },
  providers,
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user?.id) token.id = user.id;
      if (!token.id) return token;

      const stale = Date.now() - (token.planCheckedAt ?? 0) > PLAN_SNAPSHOT_TTL_MS;
      if (user || trigger === "update" || stale) {
        const record = await prisma.user.findUnique({
          where: { id: token.id },
          select: { plan: true, trialEndsAt: true },
        });
        token.plan = record?.plan ?? Plan.TRIAL;
        token.trialEndsAt = record?.trialEndsAt?.toISOString() ?? null;
        token.planCheckedAt = Date.now();
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.plan = token.plan ?? Plan.TRIAL;
        session.user.trialEndsAt = token.trialEndsAt ?? null;
      }
      return session;
    },
  },
  events: {
    /**
     * Google sign-ups arrive here with no trial window set. Email sign-ups set
     * their own in /api/auth/register, so this only fills the gap.
     */
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: Plan.TRIAL, trialEndsAt: trialEndDate() },
      });
    },
  },
};

export { TRIAL_DAYS };

/** The session for the current request, or null. */
export function auth() {
  return getServerSession(authOptions);
}

/**
 * The full User row for the current request. Prefer this over the session
 * anywhere plan, bankroll or limits matter — the session is a cached snapshot,
 * this is the record.
 */
export async function currentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}
