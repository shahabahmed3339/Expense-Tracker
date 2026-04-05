import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { sumFloats } from "@/lib/calculations/split";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid month format (use YYYY-MM)" });
  }
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

export async function calculateMonthlyExpenseTotal(
  prisma: PrismaClient,
  userId: string,
  month: string,
) {
  const { start, end } = monthRange(month);
  const agg = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      userId,
      date: { gte: start, lt: end },
    },
  });
  return agg._sum.amount ?? 0;
}

export async function listExpenses(
  prisma: PrismaClient,
  userId: string,
  opts: { cursor?: string; take?: number } = {},
) {
  const take = Math.min(opts.take ?? 20, 100);
  const rows = await prisma.expense.findMany({
    where: { userId },
    include: { category: true, splits: { include: { person: true } } },
    orderBy: { date: "desc" },
    take: take + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });
  let nextCursor: string | undefined;
  if (rows.length > take) {
    const extra = rows.pop();
    nextCursor = extra?.id;
  }
  return { items: rows, nextCursor };
}

export async function createExpense(
  prisma: PrismaClient,
  userId: string,
  data: { amount: number; categoryId: string; date: Date; note?: string | null },
) {
  const cat = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!cat) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  }
  return prisma.expense.create({
    data: {
      userId,
      categoryId: data.categoryId,
      amount: data.amount,
      date: data.date,
      note: data.note ?? undefined,
    },
    include: { category: true },
  });
}

export async function createExpenseWithSplits(
  prisma: PrismaClient,
  userId: string,
  data: {
    amount: number;
    categoryId: string;
    date: Date;
    note?: string | null;
    splits: { personId: string; amount: number }[];
  },
) {
  const sum = sumFloats(data.splits.map((s) => s.amount));
  if (Math.abs(sum - data.amount) > 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Split amounts must sum to expense amount",
    });
  }

  for (const s of data.splits) {
    const person = await prisma.person.findFirst({ where: { id: s.personId, userId } });
    if (!person) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Person ${s.personId} not found` });
    }
  }

  return prisma.$transaction(async (tx) => {
    const cat = await tx.category.findFirst({
      where: { id: data.categoryId, userId },
    });
    if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });

    const expense = await tx.expense.create({
      data: {
        userId,
        categoryId: data.categoryId,
        amount: data.amount,
        date: data.date,
        note: data.note ?? undefined,
        splits: {
          create: data.splits.map((s) => ({
            personId: s.personId,
            amount: s.amount,
          })),
        },
      },
      include: { category: true, splits: { include: { person: true } } },
    });
    return expense;
  });
}

export async function updateExpense(
  prisma: PrismaClient,
  userId: string,
  id: string,
  patch: { amount?: number; categoryId?: string; date?: Date; note?: string | null },
) {
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
  }
  if (patch.categoryId) {
    const cat = await prisma.category.findFirst({
      where: { id: patch.categoryId, userId },
    });
    if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });
  }
  return prisma.expense.update({
    where: { id },
    data: {
      ...(patch.amount !== undefined && { amount: patch.amount }),
      ...(patch.categoryId !== undefined && { categoryId: patch.categoryId }),
      ...(patch.date !== undefined && { date: patch.date }),
      ...(patch.note !== undefined && { note: patch.note === null ? null : patch.note }),
    },
    include: { category: true },
  });
}

export async function deleteExpense(prisma: PrismaClient, userId: string, id: string) {
  const existing = await prisma.expense.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
  }
  return prisma.expense.delete({ where: { id } });
}
