import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildLoginOtpEmail, sendEmail } from "@/server/auth/email";
import { addMinutes, generateOtpCode, maskEmail } from "@/server/auth/tokens";
import { prisma } from "@/server/db/client";
import { createRateLimitKey, enforceRateLimit } from "@/server/middleware/rateLimit";

const bodySchema = z.object({
  challengeId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, {
      scope: "auth:login:resend:ip",
      limit: 10,
      windowMs: 15 * 60 * 1000,
      message: "Too many OTP resend requests. Please wait before trying again.",
    });
    if (ipLimit) return ipLimit;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const challenge = await prisma.loginOtpChallenge.findUnique({
      where: { id: parsed.data.challengeId },
      include: { user: true },
    });

    if (!challenge || challenge.consumedAt || challenge.user.emailVerified === null) {
      return NextResponse.json({ error: "OTP challenge is invalid" }, { status: 400 });
    }

    const challengeLimit = enforceRateLimit(req, {
      scope: "auth:login:resend:challenge",
      key: createRateLimitKey(req, challenge.id),
      limit: 3,
      windowMs: 2 * 60 * 1000,
      message: "You can resend the OTP again after the current code expires.",
    });
    if (challengeLimit) return challengeLimit;

    const otpCode = generateOtpCode();
    const updated = await prisma.loginOtpChallenge.update({
      where: { id: challenge.id },
      data: {
        codeHash: await hash(otpCode, 10),
        expiresAt: addMinutes(new Date(), 2),
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
    return NextResponse.json({ error: "Unable to resend OTP" }, { status: 500 });
  }
}
