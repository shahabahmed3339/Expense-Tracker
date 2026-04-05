import { z } from "zod";
import { LoanType } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import {
  addLoanTransaction,
  createLoan,
  deleteLoan,
  listLoans,
  loanBalance,
  updateLoan,
} from "../services/loan.service";

export const loanRouter = router({
  list: protectedProcedure.query(({ ctx }) => listLoans(ctx.prisma, ctx.session.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        personId: z.string().min(1),
        type: z.nativeEnum(LoanType),
        totalAmount: z.number().positive(),
      }),
    )
    .mutation(({ ctx, input }) => createLoan(ctx.prisma, ctx.session.user.id, input)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        totalAmount: z.number().positive().optional(),
        personId: z.string().min(1).optional(),
        type: z.nativeEnum(LoanType).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return updateLoan(ctx.prisma, ctx.session.user.id, id, patch);
    }),

  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => deleteLoan(ctx.prisma, ctx.session.user.id, input)),

  balance: protectedProcedure
    .input(z.string().min(1))
    .query(({ ctx, input }) => loanBalance(ctx.prisma, ctx.session.user.id, input)),

  addTransaction: protectedProcedure
    .input(
      z.object({
        loanId: z.string().min(1),
        amount: z.number().positive(),
        date: z.coerce.date(),
        note: z.string().optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => addLoanTransaction(ctx.prisma, ctx.session.user.id, input)),
});
