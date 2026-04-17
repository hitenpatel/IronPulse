/**
 * Lazily imports Sentry and captures an exception.
 * Falls back silently when Sentry is not installed or not configured,
 * so integration code can always call this without hard-depending on @sentry/nextjs.
 */
export async function captureError(
  err: unknown,
  context?: Record<string, unknown>,
): Promise<void> {
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(err, { extra: context });
  } catch {
    // Sentry not available — swallow silently
  }
}
