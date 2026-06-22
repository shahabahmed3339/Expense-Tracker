import type { PrismaClient } from "@prisma/client";
import { monthRange } from "@/lib/dates/month";
import { toNumber } from "@/lib/money";
import { calculateNetExpenseTotalForRange, getNetCategorySpendTotals } from "./expense.service";

export async function getMonthlyReport(prisma: PrismaClient, userId: string, month: string) {
  const { start, end } = monthRange(month);
  const [totalSpent, byCategory, expenses, budgets] = await Promise.all([
    calculateNetExpenseTotalForRange(prisma, userId, start, end),
    getNetCategorySpendTotals(prisma, userId),
    prisma.expense.findMany({
      where: { userId, date: { gte: start, lt: end } },
      include: { category: true, splits: true },
      orderBy: [{ date: "desc" }],
    }),
    prisma.budget.findMany({
      where: { userId, month },
      include: { category: true },
    }),
  ]);

  return {
    month,
    totalSpent,
    byCategory,
    expenses: expenses.map((expense) => ({
      id: expense.id,
      amount: toNumber(expense.amount),
      date: expense.date,
      categoryName: expense.category.name,
      note: expense.note,
      splitCount: expense.splits.length,
    })),
    budgets: budgets.map((budget) => ({
      id: budget.id,
      categoryName: budget.category.name,
      amount: toNumber(budget.amount),
      isRecurring: budget.isRecurring,
    })),
  };
}

export async function exportUserData(prisma: PrismaClient, userId: string) {
  const [user, categories, expenses, budgets, loans, people, recurringExpenses] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          defaultCurrency: true,
          locale: true,
          timezone: true,
          createdAt: true,
        },
      }),
      prisma.category.findMany({ where: { userId } }),
      prisma.expense.findMany({
        where: { userId },
        include: { splits: true, category: true },
      }),
      prisma.budget.findMany({ where: { userId }, include: { category: true } }),
      prisma.loan.findMany({
        where: { userId },
        include: { transactions: true, person: true },
      }),
      prisma.person.findMany({ where: { userId } }),
      prisma.recurringExpense.findMany({ where: { userId }, include: { category: true } }),
    ]);

  return {
    exportedAt: new Date().toISOString(),
    user,
    categories,
    expenses: expenses.map((e) => ({
      ...e,
      amount: toNumber(e.amount),
      splits: e.splits.map((s) => ({ ...s, amount: toNumber(s.amount) })),
    })),
    budgets: budgets.map((b) => ({ ...b, amount: toNumber(b.amount) })),
    loans: loans.map((l) => ({
      ...l,
      totalAmount: toNumber(l.totalAmount),
      transactions: l.transactions.map((t) => ({ ...t, amount: toNumber(t.amount) })),
    })),
    people,
    recurringExpenses: recurringExpenses.map((r) => ({ ...r, amount: toNumber(r.amount) })),
  };
}
