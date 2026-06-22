import { prisma } from "@/server/db/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "ok", timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
