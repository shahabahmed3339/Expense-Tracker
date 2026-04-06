import { z } from "zod";
import { protectedProcedure, router } from "../trpc";
import {
  changePassword,
  deleteAccount,
  getProfile,
  setOtpEnabled,
  updateProfile,
} from "../services/profile.service";

export const profileRouter = router({
  me: protectedProcedure.query(({ ctx }) => getProfile(ctx.prisma, ctx.session.user.id)),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().max(120),
        email: z.string().email(),
        image: z.string().max(300_000).nullable(),
      }),
    )
    .mutation(({ ctx, input }) => updateProfile(ctx.prisma, ctx.session.user.id, input)),

  changePassword: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8).max(128),
      }),
    )
    .mutation(({ ctx, input }) => changePassword(ctx.prisma, ctx.session.user.id, input)),

  setOtpEnabled: protectedProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ ctx, input }) => setOtpEnabled(ctx.prisma, ctx.session.user.id, input.enabled)),

  deleteAccount: protectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1).nullable(),
      }),
    )
    .mutation(({ ctx, input }) => deleteAccount(ctx.prisma, ctx.session.user.id, input.currentPassword)),
});
