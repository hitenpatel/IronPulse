import { createTRPCRouter } from "./trpc.js";
import { authRouter } from "./routers/auth.js";
import { userRouter } from "./routers/user.js";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
});

export type AppRouter = typeof appRouter;
