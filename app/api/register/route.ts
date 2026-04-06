import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildVerificationEmail, sendEmail } from "@/server/auth/email";
import { addHours, generateVerificationToken } from "@/server/auth/tokens";
import { prisma } from "@/server/db/client";
import { createRateLimitKey, enforceRateLimit } from "@/server/middleware/rateLimit";
import { getPasswordValidationMessage } from "@/lib/auth/password";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().max(120).optional(),
});

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, {
      scope: "auth:register:ip",
      limit: 8,
      windowMs: 15 * 60 * 1000,
      message: "Too many sign-up attempts. Please wait before trying again.",
    });
    if (ipLimit) return ipLimit;

    const json = await req.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    const { email, password, name } = parsed.data;
    const normalized = email.trim().toLowerCase();
    const emailLimit = enforceRateLimit(req, {
      scope: "auth:register:email",
      key: createRateLimitKey(req, normalized),
      limit: 4,
      windowMs: 15 * 60 * 1000,
      message: "Too many sign-up attempts for this email. Please wait a bit.",
    });
    if (emailLimit) return emailLimit;

    const passwordError = getPasswordValidationMessage(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const passwordHash = await hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: normalized,
        name: name?.trim() || null,
        passwordHash,
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
    const emailPayload = buildVerificationEmail(user.name, verificationUrl);
    await sendEmail({
      to: normalized,
      ...emailPayload,
    });

    return NextResponse.json({ ok: true, requiresVerification: true });
  } catch {
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
