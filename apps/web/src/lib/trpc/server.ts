import "server-only";
import { createTRPCContext, createCallerFactory, appRouter } from "@mettlelift/api";
import { db } from "@mettlelift/db";
import { auth } from "@/lib/auth";

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  const session = await auth();

  return createCaller(
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
    })
  );
}
