import { NextResponse } from "next/server";
import { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  WHOP_USER_METADATA_KEY,
  toDate,
  verifyWhopSignature,
  type WhopEvent,
} from "@/lib/whop";

/**
 * Whop webhook receiver — the only writer of billing state in this app.
 *
 * The body is read as raw text before parsing because the signature is computed
 * over the exact bytes Whop sent; re-serialising parsed JSON would change the
 * whitespace and fail every verification.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature =
    request.headers.get("x-whop-signature") ?? request.headers.get("whop-signature");

  if (!verifyWhopSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: WhopEvent;
  try {
    event = JSON.parse(rawBody) as WhopEvent;
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const action = event.action ?? "";
  const data = event.data ?? {};
  const membershipId = data.id ?? null;

  const user = await findUser(data, membershipId);
  if (!user) {
    // A 200 with an explanatory body: retrying will not make an unmatched
    // membership match, and a 4xx here would have Whop redeliver indefinitely.
    console.warn("[whop] no account matched for membership", membershipId, action);
    return NextResponse.json({ ok: true, matched: false });
  }

  switch (action) {
    case "membership.went_valid": {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: Plan.ACTIVE,
          whopMembershipId: membershipId,
          whopUserId: data.user_id ?? user.whopUserId,
          subscriptionEndsAt: toDate(data.renewal_period_end),
        },
      });
      break;
    }

    case "membership.went_invalid": {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: Plan.EXPIRED, subscriptionEndsAt: toDate(data.renewal_period_end) },
      });
      break;
    }

    case "membership.cancel_at_period_end_changed": {
      // The membership is still valid until the period ends — this only moves
      // the date. Access is not touched here.
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionEndsAt: toDate(data.renewal_period_end) },
      });
      break;
    }

    default:
      return NextResponse.json({ ok: true, handled: false });
  }

  return NextResponse.json({ ok: true });
}

/**
 * Resolve the account this membership belongs to, in descending order of
 * reliability: the id we put on the checkout link, a membership we have already
 * seen, then the Whop user id, then the email address as a last resort.
 */
async function findUser(data: WhopEvent["data"] = {}, membershipId: string | null) {
  const metadataId = data.metadata?.[WHOP_USER_METADATA_KEY];
  if (typeof metadataId === "string" && metadataId) {
    const byMetadata = await prisma.user.findUnique({ where: { id: metadataId } });
    if (byMetadata) return byMetadata;
  }

  if (membershipId) {
    const byMembership = await prisma.user.findUnique({
      where: { whopMembershipId: membershipId },
    });
    if (byMembership) return byMembership;
  }

  if (data.user_id) {
    const byWhopUser = await prisma.user.findFirst({ where: { whopUserId: data.user_id } });
    if (byWhopUser) return byWhopUser;
  }

  const email = data.user?.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.user.findUnique({ where: { email } });
    if (byEmail) return byEmail;
  }

  return null;
}
