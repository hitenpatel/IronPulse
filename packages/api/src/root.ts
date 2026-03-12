import { createTRPCRouter } from "./trpc.js";
import { authRouter } from "./routers/auth.js";

export const appRouter = createTRPCRouter({
  auth: authRouter,
});

export type AppRouter = typeof appRouter;
