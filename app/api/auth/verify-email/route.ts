import { NextResponse } from "next/server";
import { AUTH_API_MESSAGES } from "@/server/config/auth";
import { AUTH_RATE_LIMITS } from "@/server/config/rateLimit";
import { prisma } from "@/server/db/client";
import { enforceRateLimit } from "@/server/middleware/rateLimit";

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, AUTH_RATE_LIMITS.verifyEmailIp);
    if (ipLimit) return ipLimit;

    const { token } = (await req.json()) as { token?: string };
    if (!token) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.missingToken }, { status: 400 });
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.consumedAt || record.expiresAt <= new Date()) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.verificationLinkInvalid }, { status: 400 });
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { emailVerified: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { consumedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: AUTH_API_MESSAGES.verificationFailed }, { status: 500 });
  }
}
