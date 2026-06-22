import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/client";
import { logAudit } from "@/server/lib/logger";

export async function createAuditLog(
  data: {
    userId?: string;
    action: string;
    resource?: string;
    metadata?: Record<string, unknown>;
    ip?: string;
  },
) {
  const metadata = data.metadata as Prisma.InputJsonValue | undefined;

  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      resource: data.resource,
      metadata,
      ip: data.ip,
    },
  });

  logAudit(data.action, data);
}
