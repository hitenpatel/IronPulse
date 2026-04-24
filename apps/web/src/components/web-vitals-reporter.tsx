"use client";

import * as Sentry from "@sentry/nextjs";
import { useReportWebVitals } from "next/web-vitals";

/**
 * Reports Next.js web-vitals metrics (CLS, LCP, INP, FCP, TTFB) to Sentry
 * as performance measurements. Sentry's `setMeasurement` attaches the
 * value to the active transaction so dashboard aggregations work over the
 * page rather than the session.
 *
 * Values for LCP/FCP/TTFB are milliseconds; CLS is unitless (cumulative
 * layout shift score). We report raw values and let Sentry bucket them —
 * Good/Needs improvement/Poor thresholds belong in the dashboard, not the
 * client.
 *
 * Gated on `NEXT_PUBLIC_SENTRY_DSN` so local dev without a DSN is a no-op.
 */
export function WebVitalsReporter() {
  useReportWebVitals((metric) => {
    if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
    try {
      const scope = Sentry.getActiveSpan();
      if (scope) {
        scope.setAttribute(`web_vital.${metric.name.toLowerCase()}`, metric.value);
        scope.setAttribute(
          `web_vital.${metric.name.toLowerCase()}.rating`,
          metric.rating,
        );
      }
      Sentry.setMeasurement(
        metric.name.toLowerCase(),
        metric.value,
        metric.name === "CLS" ? "" : "millisecond",
      );
    } catch {
      // Never let telemetry crash the page.
    }
  });
  return null;
}
