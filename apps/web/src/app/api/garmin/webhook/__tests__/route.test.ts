import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Keep the route from hitting the real DB or firing captureError.
vi.mock("@ironpulse/db", () => ({ db: {} }));
vi.mock("@ironpulse/api/src/lib/garmin", () => ({
  importGarminActivity: vi.fn(),
}));
vi.mock("@ironpulse/api/src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

const SECRET = "test-garmin-secret";

function signedRequest(payload: object, opts: { secret?: string; signature?: string } = {}) {
  const raw = JSON.stringify(payload);
  const sig =
    opts.signature ??
    crypto
      .createHmac("sha256", opts.secret ?? SECRET)
      .update(raw)
      .digest("hex");
  return new Request("https://example/api/garmin/webhook", {
    method: "POST",
    headers: { "x-garmin-signature": sig, "content-type": "application/json" },
    body: raw,
  });
}

describe("POST /api/garmin/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("GARMIN_WEBHOOK_SECRET", SECRET);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("accepts a correctly signed payload", async () => {
    const { POST } = await import("../route");
    const res = await POST(signedRequest({ activityDetails: [] }) as never);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it("rejects requests without a signature", async () => {
    const { POST } = await import("../route");
    const req = new Request("https://example/api/garmin/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ activityDetails: [] }),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
  });

  it("rejects requests with a mismatched signature", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      signedRequest(
        { activityDetails: [{ userId: "u1", activityId: 123 }] },
        { secret: "wrong-secret" },
      ) as never,
    );
    expect(res.status).toBe(401);
  });

  it("fails closed with 503 when the secret is not configured", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("../route");
    const res = await POST(signedRequest({ activityDetails: [] }) as never);
    expect(res.status).toBe(503);
  });

  it("rejects signatures of the wrong length without crashing", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      signedRequest({ activityDetails: [] }, { signature: "deadbeef" }) as never,
    );
    expect(res.status).toBe(401);
  });
});
