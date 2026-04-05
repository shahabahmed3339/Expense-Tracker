import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  createExpense,
  createExpenseWithSplits,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "../services/expense.service";

const splitLine = z.object({
  personId: z.string().min(1),
  amount: z.number().positive(),
});

export const expenseRouter = router({
  list: protectedProcedure
    .input(
      z
        .object({
          cursor: z.string().optional().nullable(),
          take: z.number().min(1).max(100).optional(),
        })
        .passthrough(),
    )
    .query(({ ctx, input }) =>
      listExpenses(ctx.prisma, ctx.session.user.id, {
        cursor: input.cursor ?? undefined,
        take: input.take,
      }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        categoryId: z.string().min(1),
        date: z.coerce.date(),
        note: z.string().optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createExpense(ctx.prisma, ctx.session.user.id, {
        amount: input.amount,
        categoryId: input.categoryId,
        date: input.date,
        note: input.note,
      }),
    ),

  createWithSplits: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        categoryId: z.string().min(1),
        date: z.coerce.date(),
        note: z.string().optional().nullable(),
        splits: z.array(splitLine).min(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      createExpenseWithSplits(ctx.prisma, ctx.session.user.id, {
        amount: input.amount,
        categoryId: input.categoryId,
        date: input.date,
        note: input.note,
        splits: input.splits,
      }),
    ),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        amount: z.number().positive().optional(),
        categoryId: z.string().min(1).optional(),
        date: z.coerce.date().optional(),
        note: z.string().optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return updateExpense(ctx.prisma, ctx.session.user.id, id, patch);
    }),

  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => deleteExpense(ctx.prisma, ctx.session.user.id, input)),
});
