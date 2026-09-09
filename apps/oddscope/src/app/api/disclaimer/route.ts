import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Records the one-time acknowledgement shown on first login. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { riskAcknowledgedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
