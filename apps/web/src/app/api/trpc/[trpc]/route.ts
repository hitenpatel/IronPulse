import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createTRPCContext } from "@ironpulse/api";
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
                id: session.user.id!,
                email: session.user.email!,
                name: session.user.name!,
                tier: (session.user as any).tier ?? "athlete",
                subscriptionStatus:
                  (session.user as any).subscriptionStatus ?? "none",
                unitSystem: (session.user as any).unitSystem ?? "metric",
              },
            }
          : null,
      }),
  });
};

export { handler as GET, handler as POST };
