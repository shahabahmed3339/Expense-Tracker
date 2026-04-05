export function loanRemainingBalance(totalAmount: number, paidSum: number): number {
  return Math.round((totalAmount - paidSum) * 100) / 100;
}
