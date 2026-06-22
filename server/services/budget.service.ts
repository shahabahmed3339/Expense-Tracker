import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { remainingBudget } from "@/lib/calculations/budget";
import { monthRange } from "@/lib/dates/month";
import { toDecimal, toNumber } from "@/lib/money";
import { getNetCategorySpendForRange } from "./expense.service";

export async function ensureRecurringBudgetsForMonth(
  prisma: PrismaClient,
  userId: string,
  month: string,
) {
  const existing = await prisma.budget.findMany({
    where: { userId, month },
    select: { categoryId: true },
  });
  const existingCategoryIds = new Set(existing.map((budget) => budget.categoryId));

  const recurringBudgets = await prisma.budget.findMany({
    where: {
      userId,
      isRecurring: true,
      month: { lt: month },
    },
    orderBy: { month: "desc" },
    select: { categoryId: true, amount: true },
  });

  const nextBudgets: { userId: string; categoryId: string; month: string; amount: ReturnType<typeof toDecimal>; isRecurring: true }[] = [];
  const seededCategoryIds = new Set<string>();

  for (const budget of recurringBudgets) {
    if (existingCategoryIds.has(budget.categoryId) || seededCategoryIds.has(budget.categoryId)) {
      continue;
    }

    seededCategoryIds.add(budget.categoryId);
    nextBudgets.push({
      userId,
      categoryId: budget.categoryId,
      month,
      amount: budget.amount,
      isRecurring: true,
    });
  }

  if (!nextBudgets.length) {
    return;
  }

  await prisma.budget.createMany({
    data: nextBudgets,
    skipDuplicates: true,
  });
}

export async function listBudgetsForMonth(prisma: PrismaClient, userId: string, month: string) {
  await ensureRecurringBudgetsForMonth(prisma, userId, month);

  return prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
    orderBy: [{ updatedAt: "desc" }, { category: { name: "asc" } }],
  });
}

export async function upsertBudget(
  prisma: PrismaClient,
  userId: string,
  data: {
    categoryId: string;
    month: string;
    amount: number;
    isRecurring?: boolean;
  },
) {
  const cat = await prisma.category.findFirst({
    where: { id: data.categoryId, userId },
  });
  if (!cat) throw new TRPCError({ code: "NOT_FOUND", message: "Category not found" });

  return prisma.budget.upsert({
    where: {
      userId_categoryId_month: {
        userId,
        categoryId: data.categoryId,
        month: data.month,
      },
    },
    create: {
      userId,
      categoryId: data.categoryId,
      month: data.month,
      amount: toDecimal(data.amount),
      isRecurring: data.isRecurring ?? false,
    },
    update: {
      amount: toDecimal(data.amount),
      ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
    },
    include: { category: true },
  });
}

export async function updateBudgetAmount(
  prisma: PrismaClient,
  userId: string,
  id: string,
  amount: number,
) {
  const row = await prisma.budget.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
  return prisma.budget.update({
    where: { id },
    data: { amount: toDecimal(amount) },
    include: { category: true },
  });
}

export async function deleteBudget(prisma: PrismaClient, userId: string, id: string) {
  const row = await prisma.budget.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
  return prisma.budget.delete({ where: { id } });
}

export async function getBudgetDetails(prisma: PrismaClient, userId: string, id: string) {
  const budget = await prisma.budget.findFirst({
    where: { id, userId },
    include: { category: true },
  });
  if (!budget) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
  }

  const { start, end } = safeMonthRange(budget.month);
  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      categoryId: budget.categoryId,
      date: { gte: start, lt: end },
    },
    include: {
      category: true,
      splits: { include: { person: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { date: "desc" }],
  });

  const spent = expenses.reduce((sum, expense) => sum + toNumber(expense.amount), 0);

  return {
    budget,
    spent,
    remaining: remainingBudget(toNumber(budget.amount), spent),
    expenseCount: expenses.length,
    expenses,
  };
}

/** Per-category remaining = budget amount - sum(expenses in month for category). */
export async function budgetVsActualForMonth(
  prisma: PrismaClient,
  userId: string,
  month: string,
) {
  await ensureRecurringBudgetsForMonth(prisma, userId, month);

  const { start, end } = safeMonthRange(month);
  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
  });
  const netSpendByCategory = await getNetCategorySpendForRange(prisma, userId, start, end);

  const rows = await Promise.all(
    budgets.map(async (b) => {
      const totalSpent = netSpendByCategory.get(b.categoryId) ?? 0;
      return {
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        budgetAmount: toNumber(b.amount),
        spent: totalSpent,
        remaining: remainingBudget(toNumber(b.amount), totalSpent),
        isRecurring: b.isRecurring,
      };
    }),
  );

  return rows;
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
