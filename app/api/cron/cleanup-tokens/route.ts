import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { env } from "@/env";
import { logger } from "@/server/lib/logger";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const [verificationTokens, otpChallenges] = await Promise.all([
    prisma.emailVerificationToken.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
    prisma.loginOtpChallenge.deleteMany({
      where: { expiresAt: { lt: now } },
    }),
  ]);

  logger.info(
    { verificationTokens: verificationTokens.count, otpChallenges: otpChallenges.count },
    "Cron token cleanup completed",
  );

  return NextResponse.json({
    ok: true,
    deleted: {
      verificationTokens: verificationTokens.count,
      otpChallenges: otpChallenges.count,
    },
  });
}
