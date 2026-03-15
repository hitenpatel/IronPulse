import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { PrismaClient } from "@ironpulse/db";
import type { SessionUser } from "@ironpulse/shared";
import { checkRateLimit, RATE_LIMITS } from "./lib/rate-limit";
import { verifyMobileToken } from "./lib/mobile-auth";

export interface CreateContextOptions {
  db: PrismaClient;
  session: { user: SessionUser } | null;
  clientIp?: string;
  authHeader?: string;
}

export const createTRPCContext = (opts: CreateContextOptions) => {
  return {
    db: opts.db,
    session: opts.session,
    clientIp: opts.clientIp,
    authHeader: opts.authHeader,
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
  // Cookie session (web)
  if (ctx.session?.user) {
    return next({
      ctx: { session: ctx.session, user: ctx.session.user },
    });
  }

  // Bearer token (mobile)
  const authHeader = (ctx as any).authHeader as string | undefined;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const user = verifyMobileToken(token);
    if (user) {
      return next({
        ctx: { session: { user }, user },
      });
    }
  }

  throw new TRPCError({ code: "UNAUTHORIZED" });
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
