import { hash } from "bcryptjs";
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
  challengeId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ipLimit = await enforceRateLimit(req, AUTH_RATE_LIMITS.loginResendIp);
    if (ipLimit) return ipLimit;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.invalidRequest }, { status: 400 });
    }

    const challenge = await prisma.loginOtpChallenge.findUnique({
      where: { id: parsed.data.challengeId },
      include: { user: true },
    });

    if (!challenge || challenge.consumedAt || challenge.user.emailVerified === null) {
      return NextResponse.json({ error: AUTH_API_MESSAGES.otpChallengeInvalid }, { status: 400 });
    }

    const challengeLimit = await enforceRateLimit(req, {
      ...AUTH_RATE_LIMITS.loginResendChallenge,
      key: createRateLimitKey(req, challenge.id),
    });
    if (challengeLimit) return challengeLimit;

    const otpCode = generateOtpCode();
    const updated = await prisma.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: {
        codeHash: await hash(otpCode, AUTH_CONFIG.otpHashRounds),
        expiresAt: addMinutes(new Date(), AUTH_TIMING.otpExpiryMinutes),
        createdAt: new Date(),
      },
    });

    await sendEmail({
      to: challenge.email,
      ...buildLoginOtpEmail(challenge.user.name, otpCode),
    });

    return NextResponse.json({
      ok: true,
      challengeId: updated.id,
      maskedEmail: maskEmail(challenge.email),
      expiresAt: updated.expiresAt.toISOString(),
    });
  } catch {
    return NextResponse.json({ error: AUTH_API_MESSAGES.loginResendFailed }, { status: 500 });
  }
}
