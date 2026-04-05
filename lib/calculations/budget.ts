export function remainingBudget(budgetAmount: number, spent: number): number {
  return Math.round((budgetAmount - spent) * 100) / 100;
}
