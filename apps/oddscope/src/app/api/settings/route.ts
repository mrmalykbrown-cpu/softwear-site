import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsRequestSchema } from "@/lib/schemas";
import { SUPPORTED_CURRENCIES } from "@/lib/format";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = settingsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the values you entered." },
      { status: 400 },
    );
  }

  const { name, bankroll, stakeUnitSize, currency, monthlyAnalysisLimit } = parsed.data;

  if (currency && !SUPPORTED_CURRENCIES.includes(currency)) {
    return NextResponse.json({ error: "That currency isn't supported yet." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(name !== undefined ? { name: name || null } : {}),
      ...(bankroll !== undefined ? { bankroll } : {}),
      ...(stakeUnitSize !== undefined ? { stakeUnitSize } : {}),
      ...(currency !== undefined ? { currency } : {}),
      ...(monthlyAnalysisLimit !== undefined ? { monthlyAnalysisLimit } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
