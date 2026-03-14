import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { PrismaClient } from "@ironpulse/db";
import type { SessionUser } from "@ironpulse/shared";
import { checkRateLimit, RATE_LIMITS } from "./lib/rate-limit";

export interface CreateContextOptions {
  db: PrismaClient;
  session: { user: SessionUser } | null;
  clientIp?: string;
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    db: opts.db,
    session: opts.session,
    clientIp: opts.clientIp,
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

export const rateLimitedProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    await checkRateLimit(`api:${ctx.user.id}`, RATE_LIMITS.api);
    return next();
  }
);

export const uploadProcedure = protectedProcedure.use(
  async ({ ctx, next }) => {
    await checkRateLimit(`upload:${ctx.user.id}`, RATE_LIMITS.upload);
    return next();
  }
);

export const authRateLimitedProcedure = publicProcedure.use(
  async ({ ctx, next }) => {
    const ip = ctx.clientIp ?? "unknown";
    await checkRateLimit(`auth:${ip}`, RATE_LIMITS.auth);
    return next();
  }
);
