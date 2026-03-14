import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { exerciseRouter } from "./routers/exercise";
import { workoutRouter } from "./routers/workout";
import { cardioRouter } from "./routers/cardio";
import { bodyMetricRouter } from "./routers/body-metric";
import { analyticsRouter } from "./routers/analytics";
import { templateRouter } from "./routers/template";
import { stripeRouter } from "./routers/stripe";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  user: userRouter,
  exercise: exerciseRouter,
  workout: workoutRouter,
  cardio: cardioRouter,
  bodyMetric: bodyMetricRouter,
  analytics: analyticsRouter,
  template: templateRouter,
  stripe: stripeRouter,
});

export type AppRouter = typeof appRouter;
