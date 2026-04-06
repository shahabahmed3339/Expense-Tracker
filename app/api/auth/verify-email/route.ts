import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { enforceRateLimit } from "@/server/middleware/rateLimit";

export async function POST(req: Request) {
  try {
    const ipLimit = enforceRateLimit(req, {
      scope: "auth:verify:token",
      limit: 20,
      windowMs: 15 * 60 * 1000,
      message: "Too many verification attempts. Please try again shortly.",
    });
    if (ipLimit) return ipLimit;

    const { token } = (await req.json()) as { token?: string };
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const record = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!record || record.consumedAt || record.expiresAt <= new Date()) {
      return NextResponse.json({ error: "Verification link is invalid or expired" }, { status: 400 });
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
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
