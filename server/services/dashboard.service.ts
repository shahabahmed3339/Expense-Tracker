import type { PrismaClient } from "@prisma/client";

export type MonthlyTrendRow = { month: string; amount: number };

export async function getMonthlyExpenseTrend(
  prisma: PrismaClient,
  userId: string,
): Promise<MonthlyTrendRow[]> {
  const rows = await prisma.$queryRaw<MonthlyTrendRow[]>`
    SELECT to_char(date, 'YYYY-MM') AS month, SUM(amount)::float AS amount
    FROM "Expense"
    WHERE "userId" = ${userId}
    GROUP BY 1
    ORDER BY 1
  `;
  return rows;
}

export async function getCategorySpendTotals(prisma: PrismaClient, userId: string) {
  const grouped = await prisma.expense.groupBy({
    by: ["categoryId"],
    _sum: { amount: true },
    where: { userId },
  });

  const categories = await prisma.category.findMany({
    where: { userId, id: { in: grouped.map((g) => g.categoryId) } },
  });
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  return grouped.map((g) => ({
    categoryId: g.categoryId,
    categoryName: nameById.get(g.categoryId) ?? g.categoryId,
    amount: g._sum.amount ?? 0,
  }));
}

export async function getDashboardSummary(prisma: PrismaClient, userId: string) {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const [monthExpenses, monthBudgets, trend, byCategory] = await Promise.all([
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { userId, date: { gte: start, lt: end } },
    }),
    prisma.budget.aggregate({
      _sum: { amount: true },
      where: { userId, month },
    }),
    getMonthlyExpenseTrend(prisma, userId),
    getCategorySpendTotals(prisma, userId),
  ]);

  const spent = monthExpenses._sum.amount ?? 0;
  const budgeted = monthBudgets._sum.amount ?? 0;

  return {
    month,
    spentThisMonth: spent,
    budgetedThisMonth: budgeted,
    remainingThisMonth: Math.round((budgeted - spent) * 100) / 100,
    trend,
    byCategory,
  };
}
