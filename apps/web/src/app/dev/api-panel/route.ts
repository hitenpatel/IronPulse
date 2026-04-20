import { notFound } from "next/navigation";
import { renderTrpcPanel } from "trpc-ui";
import { appRouter } from "@ironpulse/api";

/**
 * Interactive tRPC API documentation. Lists every procedure with its Zod
 * input/output schema and lets developers invoke them from the browser.
 *
 * Gated to non-production so we don't expose the API surface publicly.
 * In dev: GET /dev/api-panel → HTML panel. In prod: 404.
 */
export function GET() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const html = renderTrpcPanel(appRouter, {
    url: "/api/trpc",
    transformer: "superjson",
    meta: {
      title: "IronPulse API",
      description:
        "All tRPC procedures exposed by the IronPulse API. Procedures built with `protectedProcedure` require an authenticated session (web cookie) or a Bearer token in the `Authorization` header (mobile). Procedures built with `rateLimitedProcedure` are additionally subject to the configured rate limit.",
    },
  });

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
