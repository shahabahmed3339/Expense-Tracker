import { router } from "../trpc";
import { budgetRouter } from "./budget";
import { categoryRouter } from "./category";
import { dashboardRouter } from "./dashboard";
import { expenseRouter } from "./expense";
import { loanRouter } from "./loan";
import { personRouter } from "./person";
import { splitRouter } from "./split";

export const appRouter = router({
  category: categoryRouter,
  expense: expenseRouter,
  budget: budgetRouter,
  loan: loanRouter,
  dashboard: dashboardRouter,
  person: personRouter,
  split: splitRouter,
});

export type AppRouter = typeof appRouter;
