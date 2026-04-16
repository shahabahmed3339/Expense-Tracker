import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { AUTH_CONFIG } from "@/lib/config/runtime";
import { buildLoginOtpEmail, sendEmail } from "@/server/auth/email";
import { addMinutes, generateOtpCode, maskEmail } from "@/server/auth/tokens";
import { AUTH_API_MESSAGES, AUTH_TIMING } from "@/server/config/auth";
import { AUTH_RATE_LIMITS } from "@/server/config/rateLimit";
import { prisma } from "@/server/db/client";
import { createRateLimitKey, enforceRateLimit } from "@/server/middleware/rateLimit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, AUTH_RATE_LIMITS.loginStartIp);
    if (ipLimit) return ipLimit;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.invalidInput }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const emailLimit = enforceRateLimit(req, {
      ...AUTH_RATE_LIMITS.loginStartEmail,
      key: createRateLimitKey(req, email),
    });
    if (emailLimit) return emailLimit;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.invalidCredentials }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.verificationRequired, requiresVerification: true }, { status: 403 });
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.invalidCredentials }, { status: 401 });
    }

    if (!user.otpEnabled) {
      return NextResponse.json({ ok: true, requiresOtp: false });
    }

    await prisma.loginOtpChallenge.deleteMany({
      where: { userId: user.id, consumedAt: null },
    });

    const otpCode = generateOtpCode();
    const challenge = await prisma.loginOtpChallenge.create({
      data: {
        userId: user.id,
        email,
        codeHash: await hash(otpCode, AUTH_CONFIG.otpHashRounds),
        expiresAt: addMinutes(new Date(), AUTH_TIMING.otpExpiryMinutes),
      },
    });

    await sendEmail({
      to: email,
      ...buildLoginOtpEmail(user.name, otpCode),
    });

    return NextResponse.json({
      ok: true,
      requiresOtp: true,
      challengeId: challenge.id,
      maskedEmail: maskEmail(email),
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: AUTH_API_MESSAGES.loginStartFailed }, { status: 500 });
  }
}
