import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { remainingBudget } from "@/lib/calculations/budget";

function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid month format (use YYYY-MM)" });
  }
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  return { start, end };
}

export async function listBudgetsForMonth(prisma: PrismaClient, userId: string, month: string) {
  return prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
    orderBy: { category: { name: "asc" } },
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
      amount: data.amount,
      isRecurring: data.isRecurring ?? false,
    },
    update: {
      amount: data.amount,
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
    data: { amount },
    include: { category: true },
  });
}

export async function deleteBudget(prisma: PrismaClient, userId: string, id: string) {
  const row = await prisma.budget.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Budget not found" });
  return prisma.budget.delete({ where: { id } });
}

/** Per-category remaining = budget amount - sum(expenses in month for category). */
export async function budgetVsActualForMonth(
  prisma: PrismaClient,
  userId: string,
  month: string,
) {
  const { start, end } = monthRange(month);
  const budgets = await prisma.budget.findMany({
    where: { userId, month },
    include: { category: true },
  });

  const rows = await Promise.all(
    budgets.map(async (b) => {
      const spent = await prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          categoryId: b.categoryId,
          date: { gte: start, lt: end },
        },
      });
      const totalSpent = spent._sum.amount ?? 0;
      return {
        budgetId: b.id,
        categoryId: b.categoryId,
        categoryName: b.category.name,
        budgetAmount: b.amount,
        spent: totalSpent,
        remaining: remainingBudget(b.amount, totalSpent),
        isRecurring: b.isRecurring,
      };
    }),
  );

  return rows;
}
