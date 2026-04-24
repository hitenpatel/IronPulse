import { Platform } from "react-native";
import { trpc } from "./trpc";

type Primitive = string | number | boolean | null;
type Context = Record<string, Primitive>;

/**
 * Mobile-side error reporter. Calls the server's `telemetry.reportClientError`
 * tRPC mutation, which forwards to Sentry via the same `captureError` used
 * by the API. Keeps error reporting centralised in one Sentry project without
 * bundling `@sentry/react-native` (which would need a native rebuild of both
 * app shells).
 *
 * Fire-and-forget: this helper MUST NOT throw, because callers use it from
 * other catch blocks. Any failure to ship the report is itself swallowed
 * (and console-logged in dev) — losing a report is always better than
 * crashing the app on the way out.
 *
 * Never pass raw request bodies, tokens, or user-supplied free text. Pull
 * out the specific fields you need and scrub them explicitly.
 */
export function captureError(err: unknown, context: Context = {}): void {
  const error =
    err instanceof Error ? err : new Error(String(err ?? "Unknown error"));

  const payload = {
    message: error.message.slice(0, 2000),
    stack: error.stack?.slice(0, 10_000),
    context: {
      platform: Platform.OS,
      ...context,
    },
  };

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.error("[telemetry]", error, context);
  }

  // fire-and-forget — mutation result ignored
  trpc.telemetry.reportClientError.mutate(payload).catch(() => {
    // Last-resort swallow; telemetry about telemetry has no destination.
  });
}
