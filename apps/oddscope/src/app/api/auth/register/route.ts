import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/schemas";
import { trialEndDate } from "@/lib/plan";

/**
 * Email/password sign-up.
 *
 * The trial window is set here rather than in a NextAuth event because a
 * credentials account is created before NextAuth ever sees it. Google sign-ups
 * take the equivalent path through the createUser event in lib/auth.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the details you entered." },
      { status: 400 },
    );
  }

  const { email, password, name } = parsed.data;

  try {
    await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash: await bcrypt.hash(password, 12),
        trialEndsAt: trialEndDate(),
      },
    });
  } catch (error) {
    // P2002 is the unique constraint on email.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with that email already exists. Log in instead." },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
