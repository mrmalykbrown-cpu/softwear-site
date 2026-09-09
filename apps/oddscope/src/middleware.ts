import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { hasAnalysisAccessFromToken } from "@/lib/access-token";

/**
 * Route protection.
 *
 * Two rules, and the second one is a product decision rather than a technical
 * one: running a new analysis needs an active plan, but /history and /settings
 * stay open to anyone signed in. A lapsed subscriber can still read their own
 * results, export their own CSV and cancel their own account. Their data is
 * not leverage.
 *
 * The plan check here reads a snapshot from the session token, which can be up
 * to a minute stale. It is a fast redirect, not an authorisation boundary — the
 * analysis route re-reads the User row before spending anything.
 */
export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth.token;

    if (pathname === "/analyze") {
      if (!hasAnalysisAccessFromToken(token?.plan, token?.trialEndsAt)) {
        return NextResponse.redirect(new URL("/upgrade", request.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: { authorized: ({ token }) => Boolean(token) },
    pages: { signIn: "/login" },
  },
);

export const config = {
  matcher: ["/dashboard/:path*", "/analyze", "/analyze/:path*", "/history/:path*", "/settings/:path*"],
};
