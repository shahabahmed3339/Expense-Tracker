import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { loanRemainingBalance } from "@/lib/calculations/loan";

export async function listLoans(prisma: PrismaClient, userId: string) {
  return prisma.loan.findMany({
    where: { userId },
    include: {
      person: true,
      transactions: { orderBy: { date: "desc" } },
    },
    orderBy: { id: "desc" },
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
  const row = await prisma.loan.findFirst({ where: { id, userId } });
  if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });

  if (patch.personId) {
    const person = await prisma.person.findFirst({ where: { id: patch.personId, userId } });
    if (!person) throw new TRPCError({ code: "NOT_FOUND", message: "Person not found" });
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
  const loan = await prisma.loan.findFirst({ where: { id: data.loanId, userId } });
  if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Loan not found" });

  return prisma.loanTransaction.create({
    data: {
      loanId: data.loanId,
      amount: data.amount,
      date: data.date,
      note: data.note ?? undefined,
    },
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
