import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { replaceExpenseSplits } from "../services/split.service";

const splitLine = z.object({
  personId: z.string().min(1),
  amount: z.number().positive(),
});

export const splitRouter = router({
  setExpenseSplits: protectedProcedure
    .input(
      z.object({
        expenseId: z.string().min(1),
        splits: z.array(splitLine),
      }),
    )
    .mutation(({ ctx, input }) =>
      replaceExpenseSplits(ctx.prisma, ctx.session.user.id, input.expenseId, input.splits),
    ),
});
