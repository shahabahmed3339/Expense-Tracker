import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { loanRemainingBalance } from "@/lib/calculations/loan";

async function getLoanWithTransactions(prisma: PrismaClient, userId: string, loanId: string) {
  const loan = await prisma.loan.findFirst({
    where: { id: loanId, userId },
    include: { transactions: true },
  });

  if (!loan) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });
  }

  return loan;
}

function assertPaymentDoesNotExceedRemaining(
  totalAmount: number,
  paidSum: number,
  paymentAmount: number,
) {
  const remaining = loanRemainingBalance(totalAmount, paidSum);

  if (paymentAmount - remaining > 0.01) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Payment cannot exceed the remaining amount of ${remaining.toFixed(2)}`,
    });
  }
}

export async function listLoans(prisma: PrismaClient, userId: string) {
  return prisma.loan.findMany({
    where: { userId },
    include: {
      person: true,
      transactions: { orderBy: [{ updatedAt: "desc" }, { date: "desc" }] },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
  });
}

export async function createLoan(
  prisma: PrismaClient,
  userId: string,
  data: { personId: string; type: "RECEIVABLE" | "PAYABLE"; totalAmount: number },
) {
  const person = await prisma.person.findFirst({ where: { id: data.personId, userId } });
  if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });

  return prisma.loan.create({
    data: {
      userId,
      personId: data.personId,
      type: data.type,
      totalAmount: data.totalAmount,
    },
    include: { person: true, transactions: true },
  });
}

export async function updateLoan(
  prisma: PrismaClient,
  userId: string,
  id: string,
  patch: { totalAmount?: number; personId?: string; type?: "RECEIVABLE" | "PAYABLE" },
) {
  const row = await getLoanWithTransactions(prisma, userId, id);
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });

  if (patch.personId) {
    const person = await prisma.person.findFirst({ where: { id: patch.personId, userId } });
    if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
  }

  if (patch.totalAmount !== undefined) {
    const paidSum = row.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    if (patch.totalAmount + 0.01 < paidSum) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Loan total cannot be less than the amount already paid",
      });
    }
  }

  return prisma.loan.update({
    where: { id },
    data: {
      ...(patch.totalAmount !== undefined && { totalAmount: patch.totalAmount }),
      ...(patch.personId !== undefined && { personId: patch.personId }),
      ...(patch.type !== undefined && { type: patch.type }),
    },
    include: { person: true, transactions: true },
  });
}

export async function deleteLoan(prisma: PrismaClient, userId: string, id: string) {
  const row = await prisma.loan.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });
  return prisma.loan.delete({ where: { id } });
}

export async function addLoanTransaction(
  prisma: PrismaClient,
  userId: string,
  data: { loanId: string; amount: number; date: Date; note?: string | null },
) {
  const loan = await getLoanWithTransactions(prisma, userId, data.loanId);
  const paidSum = loan.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  assertPaymentDoesNotExceedRemaining(loan.totalAmount, paidSum, data.amount);

  return prisma.$transaction(async (tx) => {
    const touchTime = new Date();
    const transaction = await tx.loanTransaction.create({
      data: {
        loanId: data.loanId,
        amount: data.amount,
        date: data.date,
        note: data.note ?? undefined,
      },
    });

    await tx.loan.update({
      where: { id: data.loanId },
      data: { updatedAt: touchTime },
    });

    return transaction;
  });
}

export async function updateLoanTransaction(
  prisma: PrismaClient,
  userId: string,
  id: string,
  patch: { amount?: number; date?: Date; note?: string | null },
) {
  const transaction = await prisma.loanTransaction.findFirst({
    where: {
      id,
      loan: { userId },
    },
  });
  if (!transaction) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
  }

  if (patch.amount !== undefined) {
    const loan = await getLoanWithTransactions(prisma, userId, transaction.loanId);
    const paidExcludingCurrent = loan.transactions
      .filter((entry) => entry.id !== transaction.id)
      .reduce((sum, entry) => sum + entry.amount, 0);

    assertPaymentDoesNotExceedRemaining(loan.totalAmount, paidExcludingCurrent, patch.amount);
  }

  return prisma.$transaction(async (tx) => {
    const touchTime = new Date();
    const updated = await tx.loanTransaction.update({
      where: { id },
      data: {
        ...(patch.amount !== undefined && { amount: patch.amount }),
        ...(patch.date !== undefined && { date: patch.date }),
        ...(patch.note !== undefined && { note: patch.note }),
      },
    });

    await tx.loan.update({
      where: { id: transaction.loanId },
      data: { updatedAt: touchTime },
    });

    return updated;
  });
}

export async function deleteLoanTransaction(prisma: PrismaClient, userId: string, id: string) {
  const transaction = await prisma.loanTransaction.findFirst({
    where: {
      id,
      loan: { userId },
    },
  });
  if (!transaction) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
  }

  return prisma.$transaction(async (tx) => {
    const touchTime = new Date();
    const deleted = await tx.loanTransaction.delete({ where: { id } });

    await tx.loan.update({
      where: { id: transaction.loanId },
      data: { updatedAt: touchTime },
    });

    return deleted;
  });
}

export async function loanBalance(prisma: PrismaClient, userId: string, loanId: string) {
  const loan = await prisma.loan.findFirst({
    where: { id: loanId, userId },
    include: { transactions: true },
  });
  if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });

  const paid = loan.transactions.reduce((s, t) => s + t.amount, 0);
  return {
    totalAmount: loan.totalAmount,
    paidSum: paid,
    remaining: loanRemainingBalance(loan.totalAmount, paid),
    type: loan.type,
  };
}
