import { router } from "../trpc";
import { budgetRouter } from "./budget";
import { categoryRouter } from "./category";
import { dashboardRouter } from "./dashboard";
import { expenseRouter } from "./expense";
import { loanRouter } from "./loan";
import { onboardingRouter } from "./onboarding";
import { personRouter } from "./person";
import { profileRouter } from "./profile";
import { recurringRouter } from "./recurring";
import { reportsRouter } from "./reports";
import { splitRouter } from "./split";

export const appRouter = router({
  category: categoryRouter,
  expense: expenseRouter,
  budget: budgetRouter,
  loan: loanRouter,
  dashboard: dashboardRouter,
  person: personRouter,
  split: splitRouter,
  profile: profileRouter,
  onboarding: onboardingRouter,
  reports: reportsRouter,
  recurring: recurringRouter,
});

export type AppRouter = typeof appRouter;
