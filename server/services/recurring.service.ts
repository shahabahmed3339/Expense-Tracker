import type { PrismaClient, RecurringCadence } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { toDecimal } from "@/lib/money";

function advanceDate(date: Date, cadence: RecurringCadence): Date {
  const next = new Date(date);
  switch (cadence) {
    case "DAILY":
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case "WEEKLY":
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case "MONTHLY":
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    case "YEARLY":
      next.setUTCFullYear(next.getUTCFullYear() + 1);
      break;
  }
  return next;
}

export async function listRecurringExpenses(prisma: PrismaClient, userId: string) {
  return prisma.recurringExpense.findMany({
    where: { userId },
    include: { category: true },
    orderBy: [{ isActive: "desc" }, { nextRunDate: "asc" }],
  });
}

export async function createRecurringExpense(
  prisma: PrismaClient,
  userId: string,
  data: {
    categoryId: string;
    amount: number;
    note?: string | null;
    cadence: RecurringCadence;
    nextRunDate: Date;
  },
) {
  const category = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!category) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  }

  return prisma.recurringExpense.create({
    data: {
      userId,
      categoryId: data.categoryId,
      amount: toDecimal(data.amount),
      note: data.note ?? undefined,
      cadence: data.cadence,
      nextRunDate: data.nextRunDate,
    },
    include: { category: true },
  });
}

export async function updateRecurringExpense(
  prisma: PrismaClient,
  userId: string,
  id: string,
  patch: {
    categoryId?: string;
    amount?: number;
    note?: string | null;
    cadence?: RecurringCadence;
    nextRunDate?: Date;
    isActive?: boolean;
  },
) {
  const existing = await prisma.recurringExpense.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Recurring expense not found" });
  }

  if (patch.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: patch.categoryId, userId },
    });
    if (!category) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
    }
  }

  return prisma.recurringExpense.update({
    where: { id },
    data: {
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.amount !== undefined && { amount: toDecimal(patch.amount) }),
      ...(patch.note !== undefined && { note: patch.note }),
      ...(patch.cadence !== undefined && { cadence: patch.cadence }),
      ...(patch.nextRunDate !== undefined && { nextRunDate: patch.nextRunDate }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
    },
    include: { category: true },
  });
}

export async function deleteRecurringExpense(prisma: PrismaClient, userId: string, id: string) {
  const existing = await prisma.recurringExpense.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Recurring expense not found" });
  }
  return prisma.recurringExpense.delete({ where: { id } });
}

export async function materializeRecurringExpenses(prisma: PrismaClient) {
  const now = new Date();
  const due = await prisma.recurringExpense.findMany({
    where: { isActive: true, nextRunDate: { lte: now } },
    take: 200,
  });

  let created = 0;

  for (const item of due) {
    await prisma.$transaction(async (tx) => {
      await tx.expense.create({
        data: {
          userId: item.userId,
          categoryId: item.categoryId,
          amount: item.amount,
          date: item.nextRunDate,
          note: item.note ? `Recurring: ${item.note}` : "Recurring expense",
        },
      });

      let nextRun = item.nextRunDate;
      while (nextRun <= now) {
        nextRun = advanceDate(nextRun, item.cadence);
      }

      await tx.recurringExpense.update({
        where: { id: item.id },
        data: { nextRunDate: nextRun },
      });
    });
    created += 1;
  }

  return { processed: due.length, created };
}
