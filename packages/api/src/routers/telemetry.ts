import { z } from "zod";
import { captureError } from "../lib/capture-error";
import { createTRPCRouter, rateLimitedProcedure } from "../trpc";

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
});
