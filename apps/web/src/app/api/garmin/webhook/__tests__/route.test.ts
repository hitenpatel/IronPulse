import crypto from "crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  webhookEvent: {
    create: vi.fn(),
  },
}));
vi.mock("@zor/db", async () => {
  const actual = await vi.importActual<typeof import("@prisma/client")>("@prisma/client");
  return { ...actual, db };
});
vi.mock("@zor/api/src/lib/garmin", () => ({
  importGarminActivity: vi.fn(),
}));
vi.mock("@zor/api/src/lib/capture-error", () => ({
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

const validPayload = { activityDetails: [{ userId: "u1", activityId: 123 }] };

describe("POST /api/garmin/webhook", () => {
  beforeEach(() => {
    vi.stubEnv("GARMIN_WEBHOOK_SECRET", SECRET);
    db.webhookEvent.create.mockReset();
    db.webhookEvent.create.mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("valid signed batch → 200, one row inserted, importGarminActivity not called", async () => {
    const { POST } = await import("../route");
    const { importGarminActivity } = await import("@zor/api/src/lib/garmin");

    const res = await POST(signedRequest(validPayload) as never);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).toHaveBeenCalledTimes(1);
    expect(db.webhookEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: "garmin",
        payload: validPayload,
        userId: null,
        status: "pending",
        nextAttemptAt: expect.any(Date),
      }),
    });
    expect(importGarminActivity).not.toHaveBeenCalled();
  });

  it("rejects requests with a mismatched signature → 401, no row", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      signedRequest(validPayload, { secret: "wrong-secret" }) as never,
    );
    expect(res.status).toBe(401);
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("rejects requests without a signature → 401, no row", async () => {
    const { POST } = await import("../route");
    const req = new Request("https://example/api/garmin/webhook", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validPayload),
    });
    const res = await POST(req as never);
    expect(res.status).toBe(401);
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when the secret is not configured, no row", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("../route");
    const res = await POST(signedRequest(validPayload) as never);
    expect(res.status).toBe(503);
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("empty activityDetails batch → 200, no row", async () => {
    const { POST } = await import("../route");
    const res = await POST(signedRequest({ activityDetails: [] }) as never);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("malformed body (missing activityId) → 400, no row", async () => {
    const { POST } = await import("../route");
    const res = await POST(
      signedRequest({ activityDetails: [{ userId: "u1" }] }) as never,
    );
    expect(res.status).toBe(400);
    expect(db.webhookEvent.create).not.toHaveBeenCalled();
  });

  it("duplicate delivery: two identical POSTs both 200, one row (hash-based idempotency)", async () => {
    db.webhookEvent.create.mockResolvedValueOnce({});
    const p2002 = Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target: ["provider_external_id_unique"] },
    });
    db.webhookEvent.create.mockRejectedValueOnce(p2002);

    const { POST } = await import("../route");
    const res1 = await POST(signedRequest(validPayload) as never);
    const res2 = await POST(signedRequest(validPayload) as never);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(db.webhookEvent.create).toHaveBeenCalledTimes(2);
  });

  it("non-P2002 DB throw → 500", async () => {
    db.webhookEvent.create.mockRejectedValue(new Error("connection refused"));
    const { POST } = await import("../route");
    const res = await POST(signedRequest(validPayload) as never);
    expect(res.status).toBe(500);
  });
});
