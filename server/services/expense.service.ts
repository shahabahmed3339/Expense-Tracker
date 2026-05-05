import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { sumFloats } from "@/lib/calculations/split";
import { monthRange } from "@/lib/dates/month";

type SplitInput = {
  personId?: string | null;
  name: string;
  amount: number;
  isSelf?: boolean;
  isPaid?: boolean;
};

type NetAmountRow = {
  amount: number | null;
};

type NetByCategoryRow = {
  categoryId: string;
  amount: number | null;
};

export type NetTrendRow = {
  month: string;
  amount: number;
};

export async function calculateMonthlyExpenseTotal(
  prisma: PrismaClient,
  userId: string,
  month: string,
) {
  const { start, end } = safeMonthRange(month);
  return calculateNetExpenseTotalForRange(prisma, userId, start, end);
}

export async function calculateNetExpenseTotalForRange(
  prisma: PrismaClient,
  userId: string,
  start: Date,
  end: Date,
) {
  const rows = await prisma.$queryRaw<NetAmountRow[]>`
    SELECT COALESCE(
      SUM(
        e."amount" - COALESCE(ps."paidAmount", 0)
      )::float,
      0
    ) AS amount
    FROM "Expense" e
    LEFT JOIN (
      SELECT "expenseId", SUM("amount")::float AS "paidAmount"
      FROM "ExpenseSplit"
      WHERE "isPaid" = true AND "isSelf" = false
      GROUP BY "expenseId"
    ) ps ON ps."expenseId" = e."id"
    WHERE e."userId" = ${userId}
      AND e."date" >= ${start}
      AND e."date" < ${end}
  `;

  return rows[0]?.amount ?? 0;
}

export async function getNetExpenseTrend(
  prisma: PrismaClient,
  userId: string,
): Promise<NetTrendRow[]> {
  const rows = await prisma.$queryRaw<NetTrendRow[]>`
    SELECT
      to_char(e."date", 'YYYY-MM') AS month,
      COALESCE(SUM(e."amount" - COALESCE(ps."paidAmount", 0))::float, 0) AS amount
    FROM "Expense" e
    LEFT JOIN (
      SELECT "expenseId", SUM("amount")::float AS "paidAmount"
      FROM "ExpenseSplit"
      WHERE "isPaid" = true AND "isSelf" = false
      GROUP BY "expenseId"
    ) ps ON ps."expenseId" = e."id"
    WHERE e."userId" = ${userId}
    GROUP BY 1
    ORDER BY 1
  `;

  return rows;
}

export async function getNetCategorySpendTotals(prisma: PrismaClient, userId: string) {
  const grouped = await prisma.$queryRaw<NetByCategoryRow[]>`
    SELECT
      e."categoryId" AS "categoryId",
      COALESCE(SUM(e."amount" - COALESCE(ps."paidAmount", 0))::float, 0) AS amount
    FROM "Expense" e
    LEFT JOIN (
      SELECT "expenseId", SUM("amount")::float AS "paidAmount"
      FROM "ExpenseSplit"
      WHERE "isPaid" = true AND "isSelf" = false
      GROUP BY "expenseId"
    ) ps ON ps."expenseId" = e."id"
    WHERE e."userId" = ${userId}
    GROUP BY e."categoryId"
  `;

  const categories = await prisma.category.findMany({
    where: { userId, id: { in: grouped.map((g) => g.categoryId) } },
  });
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  return grouped.map((row) => ({
    categoryId: row.categoryId,
    categoryName: nameById.get(row.categoryId) ?? row.categoryId,
    amount: row.amount ?? 0,
  }));
}

export async function getNetCategorySpendForRange(
  prisma: PrismaClient,
  userId: string,
  start: Date,
  end: Date,
) {
  const grouped = await prisma.$queryRaw<NetByCategoryRow[]>`
    SELECT
      e."categoryId" AS "categoryId",
      COALESCE(SUM(e."amount" - COALESCE(ps."paidAmount", 0))::float, 0) AS amount
    FROM "Expense" e
    LEFT JOIN (
      SELECT "expenseId", SUM("amount")::float AS "paidAmount"
      FROM "ExpenseSplit"
      WHERE "isPaid" = true AND "isSelf" = false
      GROUP BY "expenseId"
    ) ps ON ps."expenseId" = e."id"
    WHERE e."userId" = ${userId}
      AND e."date" >= ${start}
      AND e."date" < ${end}
    GROUP BY e."categoryId"
  `;

  return new Map(grouped.map((row) => [row.categoryId, row.amount ?? 0]));
}

export async function listExpenses(
  prisma: PrismaClient,
  userId: string,
  opts: { cursor?: string; take?: number; month?: string } = {},
) {
  const take = Math.min(opts.take ?? 20, 100);
  const monthFilter = opts.month ? safeMonthRange(opts.month) : null;
  const rows = await prisma.expense.findMany({
    where: {
      userId,
      ...(monthFilter
        ? {
            date: {
              gte: monthFilter.start,
              lt: monthFilter.end,
            },
          }
        : {}),
    },
    include: { category: true, splits: { include: { person: true } } },
    orderBy: [{ updatedAt: "desc" }, { date: "desc" }],
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

function safeMonthRange(month: string) {
  try {
    return monthRange(month);
  } catch (error) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: error instanceof Error ? error.message : "Invalid month format",
    });
  }
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
    splits: SplitInput[];
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
    if (s.isSelf) {
      continue;
    }

    if (!s.personId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Split participant is missing" });
    }

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
            personId: s.personId ?? null,
            name: s.name,
            amount: s.amount,
            isSelf: s.isSelf ?? false,
            isPaid: s.isPaid ?? false,
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
