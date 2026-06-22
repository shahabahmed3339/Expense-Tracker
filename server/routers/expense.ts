import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/lib/config/runtime";
import { router, protectedProcedure } from "../trpc";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  updateExpense,
} from "../services/expense.service";

const splitLine = z.object({
  personId: z.string().min(1).optional().nullable(),
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  isSelf: z.boolean().optional(),
  isPaid: z.boolean().optional(),
});

export const expenseRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional().nullable(),
        month: z
          .string()
          .regex(/^\d{4}-\d{2}$/, VALIDATION_MESSAGES.invalidMonthFormat)
          .optional()
          .nullable(),
        take: z.number().min(1).max(100).optional(),
      }),
    )
    .query(({ ctx, input }) =>
      listExpenses(ctx.prisma, ctx.session.user.id, {
        cursor: input.cursor ?? undefined,
        month: input.month ?? undefined,
        take: input.take,
      }),
    ),

  create: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        categoryId: z.string().min(1),
        date: z.coerce.date(),
        note: z.string().max(500).optional().nullable(),
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

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        amount: z.number().positive().optional(),
        categoryId: z.string().min(1).optional(),
        date: z.coerce.date().optional(),
        note: z.string().max(500).optional().nullable(),
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

// splitLine exported for split router compatibility
export { splitLine };
