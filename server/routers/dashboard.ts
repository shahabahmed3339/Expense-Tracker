import { router, protectedProcedure } from "../trpc";
import {
  getCategorySpendTotals,
  getDashboardSummary,
  getMonthlyExpenseTrend,
} from "../services/dashboard.service";

export const dashboardRouter = router({
  summary: protectedProcedure.query(({ ctx }) =>
    getDashboardSummary(ctx.prisma, ctx.session.user.id),
  ),

  trend: protectedProcedure.query(({ ctx }) =>
    getMonthlyExpenseTrend(ctx.prisma, ctx.session.user.id),
  ),

  byCategory: protectedProcedure.query(({ ctx }) =>
    getCategorySpendTotals(ctx.prisma, ctx.session.user.id),
  ),
});
