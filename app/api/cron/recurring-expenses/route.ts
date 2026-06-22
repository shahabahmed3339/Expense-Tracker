import { NextResponse } from "next/server";
import { prisma } from "@/server/db/client";
import { env } from "@/env";
import { logger } from "@/server/lib/logger";
import { materializeRecurringExpenses } from "@/server/services/recurring.service";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (env.CRON_SECRET && authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await materializeRecurringExpenses(prisma);
  logger.info(result, "Recurring expense materialization completed");

  return NextResponse.json({ ok: true, ...result });
}
