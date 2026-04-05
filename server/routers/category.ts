import { z } from "zod";
import { CategoryType } from "@prisma/client";
import { router, protectedProcedure } from "../trpc";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../services/category.service";

export const categoryRouter = router({
  list: protectedProcedure.query(({ ctx }) => listCategories(ctx.prisma, ctx.session.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        type: z.nativeEnum(CategoryType),
      }),
    )
    .mutation(({ ctx, input }) => createCategory(ctx.prisma, ctx.session.user.id, input)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(120).optional(),
        type: z.nativeEnum(CategoryType).optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return updateCategory(ctx.prisma, ctx.session.user.id, id, patch);
    }),

  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => deleteCategory(ctx.prisma, ctx.session.user.id, input)),
});
