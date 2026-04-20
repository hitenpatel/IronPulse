import { test, expect } from "@playwright/test";

/**
 * CSRF protection across the IronPulse API surface.
 *
 * Covers:
 * - NextAuth CSRF token endpoint exists and returns a token
 * - OAuth integration callbacks reject missing or forged `state` param
 * - Stripe webhook rejects requests missing the signature header
 * - Cron endpoints reject requests missing the `CRON_SECRET` bearer
 *
 * Browser-enforced CSRF (SameSite=Lax cookies on the NextAuth session) is
 * covered implicitly by the rest of the auth E2E suite — a cross-origin
 * POST without a matching cookie can't ride a session into a mutation.
 */

test.describe("CSRF protection", () => {
  test("NextAuth exposes a CSRF token via /api/auth/csrf", async ({
    request,
  }) => {
    const res = await request.get("/api/auth/csrf");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("csrfToken");
    expect(typeof body.csrfToken).toBe("string");
    expect(body.csrfToken.length).toBeGreaterThan(32);
  });

  test("OAuth callback rejects missing state param", async ({ request }) => {
    const res = await request.get("/api/strava/callback?code=forged", {
      maxRedirects: 0,
    });
    // either redirect to an error page, or return 4xx — both are acceptable rejections
    expect([302, 303, 400, 401, 403]).toContain(res.status());
    const location = res.headers()["location"] ?? "";
    if (res.status() >= 300 && res.status() < 400) {
      expect(location).toMatch(/error=invalid_state|\berror=/);
    }
  });

  test("OAuth callback rejects forged state param", async ({ request }) => {
    const forged = "a".repeat(64);
    const res = await request.get(
      `/api/strava/callback?code=forged&state=${forged}`,
      { maxRedirects: 0 },
    );
    expect([302, 303, 400, 401, 403]).toContain(res.status());
    const location = res.headers()["location"] ?? "";
    if (res.status() >= 300 && res.status() < 400) {
      expect(location).toMatch(/error=invalid_state|\berror=/);
    }
  });

  test("Stripe webhook rejects requests without signature header", async ({
    request,
  }) => {
    const res = await request.post("/api/stripe/webhook", {
      data: JSON.stringify({ type: "checkout.session.completed", data: {} }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status()).toBe(400);
  });

  test("Cron endpoints reject requests without CRON_SECRET bearer", async ({
    request,
  }) => {
    const res = await request.post("/api/cron/cleanup-tokens");
    expect([401, 403]).toContain(res.status());
  });

  test("Cron endpoints reject requests with wrong CRON_SECRET", async ({
    request,
  }) => {
    const res = await request.post("/api/cron/cleanup-tokens", {
      headers: { authorization: "Bearer not-the-real-secret" },
    });
    expect([401, 403]).toContain(res.status());
  });
});
