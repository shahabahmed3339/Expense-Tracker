import { NextResponse } from "next/server";
import { buildVerificationEmail, sendEmail } from "@/server/auth/email";
import { addHours, generateVerificationToken } from "@/server/auth/tokens";
import { AUTH_API_MESSAGES, AUTH_TIMING } from "@/server/config/auth";
import { AUTH_RATE_LIMITS } from "@/server/config/rateLimit";
import { prisma } from "@/server/db/client";
import { createRateLimitKey, enforceRateLimit } from "@/server/middleware/rateLimit";

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, AUTH_RATE_LIMITS.resendVerificationIp);
    if (ipLimit) return ipLimit;

    const { email } = (await req.json()) as { email?: string };
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.emailRequired }, { status: 400 });
    }

    const emailLimit = enforceRateLimit(req, {
      ...AUTH_RATE_LIMITS.resendVerificationEmail,
      key: createRateLimitKey(req, normalized),
    });
    if (emailLimit) return emailLimit;

    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (!user) {
      return NextResponse.json({ ok: true });
    }
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true });
    }

    await prisma.emailVerificationToken.deleteMany({
      where: {
        userId: user.id,
        consumedAt: null,
      },
    });

    const token = generateVerificationToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        email: normalized,
        token,
        expiresAt: addHours(new Date(), AUTH_TIMING.verificationExpiryHours),
      },
    });

    const origin = process.env.NEXTAUTH_URL ?? new URL(req.url).origin;
    const verificationUrl = `${origin}/verify-email?token=${token}`;
    await sendEmail({
      to: normalized,
      ...buildVerificationEmail(user.name, verificationUrl),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: AUTH_API_MESSAGES.verificationResendFailed }, { status: 500 });
  }
}
