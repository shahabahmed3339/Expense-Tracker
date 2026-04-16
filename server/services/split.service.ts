import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { sumFloats } from "@/lib/calculations/split";

export async function replaceExpenseSplits(
  prisma: PrismaClient,
  userId: string,
  expenseId: string,
  splits: {
    personId?: string | null;
    name: string;
    amount: number;
    isSelf?: boolean;
    isPaid?: boolean;
  }[],
) {
  const expense = await prisma.expense.findFirst({ where: { id: expenseId, userId } });
  if (!expense) throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });

  if (splits.length > 0) {
    const sum = sumFloats(splits.map((s) => s.amount));
    if (Math.abs(sum - expense.amount) > 0.01) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Split amounts must sum to expense amount",
      });
    }
  }

  for (const s of splits) {
    if (s.isSelf) {
      continue;
    }

    if (!s.personId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Split participant is missing" });
    }

    const person = await prisma.person.findFirst({ where: { id: s.personId, userId } });
    if (!person) {
      throw new TRPCError({ code: "NOT_FOUND", message: `Person ${s.personId} not found` });
    }
  }

  return prisma.$transaction(async (tx) => {
    const touchTime = new Date();
    await tx.expenseSplit.deleteMany({ where: { expenseId } });
    if (splits.length === 0) {
      await tx.expense.update({
        where: { id: expenseId },
        data: { updatedAt: touchTime },
      });
      const cleared = await tx.expense.findUnique({
        where: { id: expenseId },
        include: { splits: { include: { person: true } }, category: true },
      });
      if (!cleared) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
      }
      return cleared;
    }
    await tx.expenseSplit.createMany({
      data: splits.map((s) => ({
        expenseId,
        personId: s.personId ?? null,
        name: s.name,
        amount: s.amount,
        isSelf: s.isSelf ?? false,
        isPaid: s.isPaid ?? false,
      })),
    });
    await tx.expense.update({
      where: { id: expenseId },
      data: { updatedAt: touchTime },
    });
    const updated = await tx.expense.findUnique({
      where: { id: expenseId },
      include: { splits: { include: { person: true } }, category: true },
    });
    if (!updated) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Expense not found" });
    }
    return updated;
  });
}
