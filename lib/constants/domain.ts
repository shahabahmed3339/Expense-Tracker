import { CategoryType, LoanType } from "@prisma/client";

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  [CategoryType.FIXED]: "Fixed",
  [CategoryType.VARIABLE]: "Variable",
};

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  [LoanType.RECEIVABLE]: "Receivable",
  [LoanType.PAYABLE]: "Payable",
};

export const LOAN_TYPE_DESCRIPTIONS: Record<LoanType, string> = {
  [LoanType.RECEIVABLE]: "Receivable (they owe you)",
  [LoanType.PAYABLE]: "Payable (you owe them)",
};
