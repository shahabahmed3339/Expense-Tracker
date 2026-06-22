import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  listRecurringExpenses,
  updateRecurringExpense,
} from "../services/recurring.service";

export const recurringRouter = router({
  list: protectedProcedure.query(({ ctx }) => listRecurringExpenses(ctx.prisma, ctx.session.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        categoryId: z.string().min(1),
        amount: z.number().positive(),
        note: z.string().max(500).optional().nullable(),
        cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]),
        nextRunDate: z.coerce.date(),
      }),
    )
    .mutation(({ ctx, input }) => createRecurringExpense(ctx.prisma, ctx.session.user.id, input)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        categoryId: z.string().min(1).optional(),
        amount: z.number().positive().optional(),
        note: z.string().max(500).optional().nullable(),
        cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]).optional(),
        nextRunDate: z.coerce.date().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return updateRecurringExpense(ctx.prisma, ctx.session.user.id, id, patch);
    }),

  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => deleteRecurringExpense(ctx.prisma, ctx.session.user.id, input)),
});
