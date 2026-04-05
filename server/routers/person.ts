import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  createPerson,
  deletePerson,
  listPeople,
  updatePerson,
} from "../services/person.service";

export const personRouter = router({
  list: protectedProcedure.query(({ ctx }) => listPeople(ctx.prisma, ctx.session.user.id)),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(120),
        contact: z.string().max(200).optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => createPerson(ctx.prisma, ctx.session.user.id, input)),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1).max(120).optional(),
        contact: z.string().max(200).optional().nullable(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...patch } = input;
      return updatePerson(ctx.prisma, ctx.session.user.id, id, patch);
    }),

  delete: protectedProcedure
    .input(z.string().min(1))
    .mutation(({ ctx, input }) => deletePerson(ctx.prisma, ctx.session.user.id, input)),
});
