import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  budgetVsActualForMonth,
  deleteBudget,
  listBudgetsForMonth,
  updateBudgetAmount,
  upsertBudget,
} from "../services/budget.service";

const monthStr = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");

export const budgetRouter = router({
  listByMonth: protectedProcedure
    .input(z.object({ month: monthStr }))
    .query(({ ctx, input }) => listBudgetsForMonth(ctx.prisma, ctx.session.user.id, input.month)),

  vsActual: protectedProcedure
    .input(z.object({ month: monthStr }))
    .query(({ ctx, input }) =>
      budgetVsActualForMonth(ctx.prisma, ctx.session.user.id, input.month),
    ),

  upsert: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().min(1),
        month: monthStr,
        amount: z.number().nonnegative(),
        isRecurring: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => upsertBudget(ctx.prisma, ctx.session.user.id, input)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        amount: z.number().nonnegative(),
      }),
    )
    .mutation(({ ctx, input }) =>
      updateBudgetAmount(ctx.prisma, ctx.session.user.id, input.id, input.amount),
    ),

  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => deleteBudget(ctx.prisma, ctx.session.user.id, input)),
});
