import { compare, hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildLoginOtpEmail, sendEmail } from "@/server/auth/email";
import { addMinutes, generateOtpCode, maskEmail } from "@/server/auth/tokens";
import { prisma } from "@/server/db/client";
import { createRateLimitKey, enforceRateLimit } from "@/server/middleware/rateLimit";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, {
      scope: "auth:login:start:ip",
      limit: 12,
      windowMs: 15 * 60 * 1000,
      message: "Too many login attempts. Please wait before trying again.",
    });
    if (ipLimit) return ipLimit;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.trim().toLowerCase();
    const password = parsed.data.password;
    const emailLimit = enforceRateLimit(req, {
      scope: "auth:login:start:email",
      key: createRateLimitKey(req, email),
      limit: 6,
      windowMs: 10 * 60 * 1000,
      message: "Too many login attempts for this email. Please wait a bit.",
    });
    if (emailLimit) return emailLimit;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: "Please verify your email before signing in", requiresVerification: true }, { status: 403 });
    }

    const ok = await compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
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
        codeHash: await hash(otpCode, 10),
        expiresAt: addMinutes(new Date(), 2),
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
    return NextResponse.json({ error: "Unable to start login" }, { status: 500 });
  }
}
