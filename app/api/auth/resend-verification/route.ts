import { NextResponse } from "next/server";
import { buildVerificationEmail, sendEmail } from "@/server/auth/email";
import { addHours, generateVerificationToken } from "@/server/auth/tokens";
import { prisma } from "@/server/db/client";
import { createRateLimitKey, enforceRateLimit } from "@/server/middleware/rateLimit";

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, {
      scope: "auth:verify:resend:ip",
      limit: 8,
      windowMs: 15 * 60 * 1000,
      message: "Too many verification resend attempts. Please wait before trying again.",
    });
    if (ipLimit) return ipLimit;

    const { email } = (await req.json()) as { email?: string };
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailLimit = enforceRateLimit(req, {
      scope: "auth:verify:resend:email",
      key: createRateLimitKey(req, normalized),
      limit: 3,
      windowMs: 15 * 60 * 1000,
      message: "Verification email already sent recently. Please check your inbox first.",
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
        expiresAt: addHours(new Date(), 24),
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
    return NextResponse.json({ error: "Unable to resend verification email" }, { status: 500 });
  }
}
