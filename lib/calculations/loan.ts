export function loanRemainingBalance(totalAmount: number, paidSum: number): number {
  return Math.max(0, Math.round((totalAmount - paidSum) * 100) / 100);
}
