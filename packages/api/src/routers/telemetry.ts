import { z } from "zod";
import { captureError } from "../lib/capture-error";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";
import { computeWorkoutEfficiencyReport } from "../lib/workout-efficiency-report";

/**
 * Receives error reports from the mobile app and forwards them to Sentry
 * via the existing `captureError` helper. Lets us consolidate client + server
 * errors in one Sentry project without bundling `@sentry/react-native` into
 * the mobile shell (which would require a native rebuild).
 *
 * Context is a loose record, not validated further — callers attach whatever
 * is useful (screen, operation, user id). Large or sensitive payloads are
 * the caller's responsibility to scrub before sending.
 */
const reportClientErrorSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(10_000).optional(),
  context: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()]),
    )
    .optional(),
});

/**
 * Workout-logging-efficiency instrumentation (TASK-24).
 *
 * PRIVACY: this schema is intentionally CLOSED (`.strict()`) — it permits
 * exactly these five scalar fields and nothing else. A future careless
 * caller cannot smuggle a weight, rep, RPE, exercise name, or note through
 * this endpoint because the schema has no field for it and rejects any
 * extra key outright. Never add a free-form `context`/`metadata` bag here —
 * that is precisely the shape that would defeat the point of this schema.
 *
 * - sessionId: opaque, client-generated per workout session. NOT the
 *   workout id — never used to join back to workout/exercise data.
 * - isFirstCompletedSet: true for exactly one event per session (the first
 *   completed set), false for every subsequent completed set in the same
 *   session.
 * - interactionCount: foreground taps/gestures on controls since the last
 *   qualifying event in this session (session start, for the first set;
 *   the previous completed set, otherwise). Text-entry keystrokes
 *   (onChangeText in weight/reps/RPE fields) are excluded by construction
 *   on the client — see apps/mobile/lib/workout-interaction-counter.ts.
 * - msSinceSessionStart: millisecond delta from the Start/Continue tap to
 *   this completed set. Only meaningful (non-null) when
 *   isFirstCompletedSet is true; null otherwise. A precomputed delta is
 *   sent rather than raw absolute timestamps, so no wall-clock reading is
 *   ever transmitted.
 * - isNewAthlete: coarse boolean cohort flag computed client-side from the
 *   count of the account's own prior completed workouts (not from account
 *   age or any other identifying signal). null when the client can't
 *   determine it. This is the only "cohort" signal this system carries;
 *   the aggregation report (see workout-efficiency-report.ts) only reports
 *   a new-vs-returning split when at least one row actually has it set.
 */
export const workoutEfficiencyEventSchema = z
  .object({
    sessionId: z.string().uuid(),
    isFirstCompletedSet: z.boolean(),
    interactionCount: z.number().int().min(0).max(10_000),
    msSinceSessionStart: z
      .number()
      .int()
      .min(0)
      .max(24 * 60 * 60 * 1000)
      .nullable(),
    isNewAthlete: z.boolean().nullable(),
  })
  .strict();

const workoutEfficiencyReportInputSchema = z.object({
  releaseAt: z.coerce.date(),
});

export const telemetryRouter = createTRPCRouter({
  reportClientError: rateLimitedProcedure
    .input(reportClientErrorSchema)
    .mutation(async ({ ctx, input }) => {
      // Synthesise an Error so the Sentry event carries the stack the client
      // provided rather than the stack from this handler.
      const err = new Error(input.message);
      if (input.stack) err.stack = input.stack;
      await captureError(err, {
        source: "mobile",
        userId: ctx.user.id,
        ...input.context,
      });
      return { ok: true };
    }),

  // Authenticated purely for spam/rate-limit control (rateLimitedProcedure).
  // ctx.user.id is deliberately never read here — the persisted row carries
  // no user-identifying column at all. See WorkoutEfficiencyEvent in
  // packages/db/prisma/schema.prisma.
  recordWorkoutEfficiencyEvent: rateLimitedProcedure
    .input(workoutEfficiencyEventSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db.workoutEfficiencyEvent.create({
        data: {
          sessionId: input.sessionId,
          isFirstCompletedSet: input.isFirstCompletedSet,
          interactionCount: input.interactionCount,
          msSinceSessionStart: input.msSinceSessionStart,
          isNewAthlete: input.isNewAthlete,
        },
      });
      return { ok: true };
    }),

  // Before-and-after report comparing a representative period either side
  // of `releaseAt`. See computeWorkoutEfficiencyReport for the aggregation
  // rules (median time-to-first-set, median taps-per-completed-set, and a
  // conditional new/returning cohort split).
  workoutEfficiencyReport: rateLimitedProcedure
    .input(workoutEfficiencyReportInputSchema)
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.workoutEfficiencyEvent.findMany({
        select: {
          isFirstCompletedSet: true,
          interactionCount: true,
          msSinceSessionStart: true,
          isNewAthlete: true,
          createdAt: true,
        },
      });
      return computeWorkoutEfficiencyReport(rows, input.releaseAt);
    }),
});
