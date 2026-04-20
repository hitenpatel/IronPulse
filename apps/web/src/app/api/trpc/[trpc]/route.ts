import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@ironpulse/api";
import { RateLimitError } from "@ironpulse/api/src/lib/rate-limit";
import { db } from "@ironpulse/db";
import { auth } from "@/lib/auth";

const handler = async (req: Request) => {
  const session = await auth();

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () =>
      createTRPCContext({
        db,
        session: session?.user
          ? {
              user: {
                id: session.user.id,
                email: session.user.email!,
                name: session.user.name!,
                tier: session.user.tier,
                subscriptionStatus: session.user.subscriptionStatus,
                unitSystem: session.user.unitSystem,
                onboardingComplete: session.user.onboardingComplete,
                defaultRestSeconds: session.user.defaultRestSeconds,
              },
            }
          : null,
        authHeader: req.headers.get("authorization") ?? undefined,
      }),
    // Set Retry-After and X-RateLimit-* headers when any procedure threw
    // a RateLimitError so clients can back off cleanly.
    responseMeta({ errors }) {
      const rateLimitErr = errors.find(
        (e): e is typeof e & { cause: RateLimitError } =>
          e.cause instanceof RateLimitError,
      );
      if (rateLimitErr?.cause) {
        const rl = rateLimitErr.cause;
        return {
          status: 429,
          headers: new Headers({
            "Retry-After": String(rl.retryAfterSeconds),
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": String(rl.remaining),
          }),
        };
      }
      return {};
    },
  });
};

export { handler as GET, handler as POST };
