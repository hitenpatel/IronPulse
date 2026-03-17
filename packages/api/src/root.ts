import { createTRPCRouter } from "./trpc";
import { authRouter } from "./routers/auth";
import { passkeyRouter } from "./routers/passkey";
import { userRouter } from "./routers/user";
import { exerciseRouter } from "./routers/exercise";
import { workoutRouter } from "./routers/workout";
import { cardioRouter } from "./routers/cardio";
import { bodyMetricRouter } from "./routers/body-metric";
import { analyticsRouter } from "./routers/analytics";
import { templateRouter } from "./routers/template";
import { stripeRouter } from "./routers/stripe";
import { syncRouter } from "./routers/sync";
import { integrationRouter } from "./routers/integration";
import { progressPhotoRouter } from "./routers/progress-photo";
import { socialRouter } from "./routers/social";
import { challengeRouter } from "./routers/challenge";
import { coachRouter } from "./routers/coach";
import { programRouter } from "./routers/program";
import { messageRouter } from "./routers/message";
import { exportRouter } from "./routers/export";

export const appRouter = createTRPCRouter({
  auth: authRouter,
  passkey: passkeyRouter,
  user: userRouter,
  exercise: exerciseRouter,
  workout: workoutRouter,
  cardio: cardioRouter,
  bodyMetric: bodyMetricRouter,
  analytics: analyticsRouter,
  template: templateRouter,
  stripe: stripeRouter,
  sync: syncRouter,
  integration: integrationRouter,
  progressPhoto: progressPhotoRouter,
  social: socialRouter,
  challenge: challengeRouter,
  coach: coachRouter,
  program: programRouter,
  message: messageRouter,
  export: exportRouter,
});

export type AppRouter = typeof appRouter;
