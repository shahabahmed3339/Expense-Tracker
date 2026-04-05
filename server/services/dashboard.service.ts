import type { PrismaClient } from "@prisma/client";
import { ensureRecurringBudgetsForMonth } from "./budget.service";
import {
  calculateNetExpenseTotalForRange,
  getNetCategorySpendTotals,
  getNetExpenseTrend,
} from "./expense.service";

export type MonthlyTrendRow = { month: string; amount: number };

export async function getMonthlyExpenseTrend(
  prisma: PrismaClient,
  userId: string,
): Promise<MonthlyTrendRow[]> {
  return getNetExpenseTrend(prisma, userId);
}

export async function getCategorySpendTotals(prisma: PrismaClient, userId: string) {
  return getNetCategorySpendTotals(prisma, userId);
}

export async function getDashboardSummary(prisma: PrismaClient, userId: string) {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  await ensureRecurringBudgetsForMonth(prisma, userId, month);

  const [spent, monthBudgets, monthBudgetCount, trend, byCategory, categoriesByType, recurringBudgetCount, totalExpenseCount, expensesThisMonth, splitExpenseCount, peopleCount, loans, recentExpenses] = await Promise.all([
    calculateNetExpenseTotalForRange(prisma, userId, start, end),
    prisma.budget.aggregate({
      _sum: { amount: true },
      where: { userId, month },
    }),
    prisma.budget.count({
      where: { userId, month },
    }),
    getMonthlyExpenseTrend(prisma, userId),
    getCategorySpendTotals(prisma, userId),
    prisma.category.groupBy({
      by: ["type"],
      _count: { _all: true },
      where: { userId },
    }),
    prisma.budget.count({
      where: { userId, month, isRecurring: true },
    }),
    prisma.expense.count({
      where: { userId },
    }),
    prisma.expense.count({
      where: {
        userId,
        date: { gte: start, lt: end },
      },
    }),
    prisma.expense.count({
      where: {
        userId,
        date: { gte: start, lt: end },
        splits: { some: {} },
      },
    }),
    prisma.person.count({ where: { userId } }),
    prisma.loan.findMany({
      where: { userId },
      include: { transactions: true },
    }),
    prisma.expense.findMany({
      where: { userId },
      include: {
        category: true,
        splits: true,
      },
      orderBy: { date: "desc" },
      take: 5,
    }),
  ]);

  const budgeted = monthBudgets._sum.amount ?? 0;
  const fixedCategories = categoriesByType.find((row) => row.type === "FIXED")?._count._all ?? 0;
  const variableCategories = categoriesByType.find((row) => row.type === "VARIABLE")?._count._all ?? 0;
  const totalCategories = fixedCategories + variableCategories;

  const loanSummary = loans.reduce(
    (summary, loan) => {
      const paid = loan.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const remaining = Math.max(loan.totalAmount - paid, 0);

      if (loan.type === "RECEIVABLE") {
        summary.receivableOutstanding += remaining;
        summary.receivableCount += remaining > 0 ? 1 : 0;
      } else {
        summary.payableOutstanding += remaining;
        summary.payableCount += remaining > 0 ? 1 : 0;
      }

      return summary;
    },
    {
      receivableOutstanding: 0,
      payableOutstanding: 0,
      receivableCount: 0,
      payableCount: 0,
    },
  );

  return {
    month,
    spentThisMonth: spent,
    budgetedThisMonth: budgeted,
    remainingThisMonth: Math.round((budgeted - spent) * 100) / 100,
    trend,
    byCategory,
    categorySummary: {
      total: totalCategories,
      fixed: fixedCategories,
      variable: variableCategories,
    },
    budgetSummary: {
      total: monthBudgetCount,
      recurring: recurringBudgetCount,
    },
    expenseSummary: {
      total: totalExpenseCount,
      thisMonth: expensesThisMonth,
      splitThisMonth: splitExpenseCount,
    },
    peopleSummary: {
      total: peopleCount,
    },
    loanSummary: {
      total: loans.length,
      receivableCount: loanSummary.receivableCount,
      payableCount: loanSummary.payableCount,
      receivableOutstanding: Math.round(loanSummary.receivableOutstanding * 100) / 100,
      payableOutstanding: Math.round(loanSummary.payableOutstanding * 100) / 100,
      netPosition: Math.round((loanSummary.receivableOutstanding - loanSummary.payableOutstanding) * 100) / 100,
    },
    recentExpenses: recentExpenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      date: expense.date,
      categoryName: expense.category.name,
      splitCount: expense.splits.length,
      note: expense.note,
    })),
  };
}
