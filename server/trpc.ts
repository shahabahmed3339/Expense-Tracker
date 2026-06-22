import { initTRPC, TRPCError } from "@trpc/server";
import { superjson } from "@/lib/superjson";
import { getServerSession } from "next-auth";
import { authOptions } from "@/server/auth/authOptions";
import { prisma } from "@/server/db/client";
import { checkUserMutationRateLimit } from "@/server/middleware/rateLimit";
import { logger } from "@/server/lib/logger";

export async function createTRPCContext() {
  const session = await getServerSession(authOptions);
  return { session, prisma };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const isProduction = process.env.NODE_ENV === "production";
    const isClientError = error.code === "BAD_REQUEST" || error.code === "NOT_FOUND" || error.code === "CONFLICT" || error.code === "UNAUTHORIZED";

    if (!isClientError) {
      logger.error({ code: error.code, message: error.message }, "tRPC error");
    }

    return {
      ...shape,
      message: isProduction && !isClientError ? "Something went wrong" : shape.message,
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUser = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user?.id) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      session: ctx.session as NonNullable<typeof ctx.session> & {
        user: { id: string };
      },
    },
  });
});

const enforceMutationRateLimit = t.middleware(async ({ ctx, next, type }) => {
  if (type === "mutation" && ctx.session?.user?.id) {
    const allowed = await checkUserMutationRateLimit(ctx.session.user.id);
    if (!allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many requests. Please slow down." });
    }
  }
  return next();
});

export const protectedProcedure = t.procedure.use(enforceUser).use(enforceMutationRateLimit);
