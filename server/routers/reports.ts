import { z } from "zod";
import { VALIDATION_MESSAGES } from "@/lib/config/runtime";
import { protectedProcedure, router } from "../trpc";
import { exportUserData, getMonthlyReport } from "../services/reports.service";
import { createAuditLog } from "../services/audit.service";

export const reportsRouter = router({
  monthly: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, VALIDATION_MESSAGES.invalidMonthFormat),
      }),
    )
    .query(({ ctx, input }) => getMonthlyReport(ctx.prisma, ctx.session.user.id, input.month)),

  exportData: protectedProcedure.mutation(async ({ ctx }) => {
    const data = await exportUserData(ctx.prisma, ctx.session.user.id);
    await createAuditLog({
      userId: ctx.session.user.id,
      action: "data.export",
      resource: "user",
    });
    return data;
  }),
});
