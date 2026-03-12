import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { PrismaClient } from "@ironpulse/db";
import type { SessionUser } from "@ironpulse/shared";

export interface CreateContextOptions {
  db: PrismaClient;
  session: { user: SessionUser } | null;
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    db: opts.db,
    session: opts.session,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createCallerFactory = t.createCallerFactory;
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: ctx.session,
      user: ctx.session.user,
    },
  });
});
