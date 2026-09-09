/**
 * The plan check middleware uses.
 *
 * Deliberately free of any Prisma import: middleware runs on the edge runtime,
 * where the Prisma client cannot load, and importing the generated Plan enum
 * for its three string values would drag the whole client in with it. The
 * literals here mirror the enum in schema.prisma.
 */

export type PlanLiteral = "TRIAL" | "ACTIVE" | "EXPIRED";

export function hasAnalysisAccessFromToken(
  plan: unknown,
  trialEndsAt: unknown,
  now: Date = new Date(),
): boolean {
  // An unrecognised or absent snapshot is not evidence of anything. Let the
  // request through and let the server-side gate — which reads the actual User
  // row — make the decision.
  if (plan !== "TRIAL" && plan !== "ACTIVE" && plan !== "EXPIRED") return true;

  if (plan === "ACTIVE") return true;
  if (plan === "EXPIRED") return false;

  if (typeof trialEndsAt !== "string") return true;
  const ends = new Date(trialEndsAt);
  return !Number.isNaN(ends.getTime()) && ends > now;
}
