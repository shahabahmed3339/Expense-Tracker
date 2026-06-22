import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/lib/config/runtime";
import { protectedProcedure, router } from "../trpc";
import { completeOnboarding, getOnboardingStatus } from "../services/onboarding.service";

export const onboardingRouter = router({
  status: protectedProcedure.query(({ ctx }) => getOnboardingStatus(ctx.prisma, ctx.session.user.id)),

  complete: protectedProcedure
    .input(
      z.object({
        name: z.string().max(100).optional(),
        defaultCurrency: z.string().length(3).optional(),
        locale: z.string().max(10).optional(),
      }),
    )
    .mutation(({ ctx, input }) => completeOnboarding(ctx.prisma, ctx.session.user.id, input)),
});
