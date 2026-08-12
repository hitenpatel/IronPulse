import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ── Mock workers ─────────────────────────────────────────────────────────────

const mockProcessFinalizations = vi.fn();
const mockDeliverNotifications = vi.fn();

vi.mock("@zor/api/src/lib/workout-finalization", () => ({
  processPendingWorkoutFinalizations: (...args: unknown[]) =>
    mockProcessFinalizations(...args),
}));

vi.mock("@zor/api/src/lib/notification-outbox", () => ({
  deliverPendingNotifications: (...args: unknown[]) =>
    mockDeliverNotifications(...args),
}));

vi.mock("@zor/db", () => ({
  PrismaClient: vi.fn(() => ({})),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const SECRET = "sweep-test-secret";

function makeRequest(opts: { authorization?: string; secret?: string } = {}) {
  const auth =
    opts.authorization !== undefined
      ? opts.authorization
      : `Bearer ${opts.secret ?? SECRET}`;
  return new Request("https://example/api/cron/finalization-sweep", {
    method: "GET",
    headers: auth ? { authorization: auth } : {},
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/cron/finalization-sweep", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    mockProcessFinalizations.mockResolvedValue({ processed: 0, skipped: 0, failed: 0 });
    mockDeliverNotifications.mockResolvedValue({ delivered: 0, skipped: 0, failed: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  // ── Auth ───────────────────────────────────────────────────────────────────

  it("returns 401 when authorization header is missing", async () => {
    const { GET } = await import("../route");
    const req = new Request("https://example/api/cron/finalization-sweep", {
      method: "GET",
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when bearer token is wrong", async () => {
    const { GET } = await import("../route");
    const res = await GET(makeRequest({ secret: "wrong-secret" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when CRON_SECRET is not set", async () => {
    vi.unstubAllEnvs();
    const { GET } = await import("../route");
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  // ── Success ────────────────────────────────────────────────────────────────

  it("returns 200 with zero counts when queues are empty", async () => {
    const { GET } = await import("../route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.finalized).toBe(0);
    expect(body.delivered).toBe(0);
    expect(body.failed).toBe(0);
  });

  it("returns finalized and delivered counts from both workers", async () => {
    mockProcessFinalizations.mockResolvedValue({ processed: 3, skipped: 1, failed: 0 });
    mockDeliverNotifications.mockResolvedValue({ delivered: 5, skipped: 0, failed: 0 });

    const { GET } = await import("../route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.finalized).toBe(3);
    expect(body.delivered).toBe(5);
    expect(body.failed).toBe(0);
  });

  it("invokes processPendingWorkoutFinalizations with limit 25", async () => {
    const { GET } = await import("../route");
    await GET(makeRequest());

    expect(mockProcessFinalizations).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 25 }),
    );
  });

  it("invokes deliverPendingNotifications with limit 25", async () => {
    const { GET } = await import("../route");
    await GET(makeRequest());

    expect(mockDeliverNotifications).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ limit: 25 }),
    );
  });

  it("runs finalizations before notifications", async () => {
    const order: string[] = [];
    mockProcessFinalizations.mockImplementation(async () => {
      order.push("finalization");
      return { processed: 1, skipped: 0, failed: 0 };
    });
    mockDeliverNotifications.mockImplementation(async () => {
      order.push("notification");
      return { delivered: 2, skipped: 0, failed: 0 };
    });

    const { GET } = await import("../route");
    await GET(makeRequest());

    expect(order).toEqual(["finalization", "notification"]);
  });

  // ── Partial failure ────────────────────────────────────────────────────────

  it("returns 207 when finalization worker reports failures", async () => {
    mockProcessFinalizations.mockResolvedValue({ processed: 2, skipped: 0, failed: 1 });

    const { GET } = await import("../route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.failed).toBeGreaterThan(0);
  });

  it("returns 207 when notification delivery worker reports failures", async () => {
    mockDeliverNotifications.mockResolvedValue({ delivered: 1, skipped: 0, failed: 2 });

    const { GET } = await import("../route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.failed).toBe(2);
  });

  it("returns 207 and sums failures from both workers", async () => {
    mockProcessFinalizations.mockResolvedValue({ processed: 1, skipped: 0, failed: 2 });
    mockDeliverNotifications.mockResolvedValue({ delivered: 0, skipped: 0, failed: 3 });

    const { GET } = await import("../route");
    const res = await GET(makeRequest());

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.failed).toBe(5);
  });

  it("continues to notification delivery even when finalization worker throws", async () => {
    mockProcessFinalizations.mockRejectedValue(new Error("DB connection lost"));
    mockDeliverNotifications.mockResolvedValue({ delivered: 3, skipped: 0, failed: 0 });

    const { GET } = await import("../route");
    const res = await GET(makeRequest());

    // 207 because finalization failed
    expect(res.status).toBe(207);
    const body = await res.json();
    // notification delivery still ran
    expect(body.delivered).toBe(3);
    expect(mockDeliverNotifications).toHaveBeenCalled();
  });

  it("returns summary shape { finalized, delivered, failed } as documented", async () => {
    mockProcessFinalizations.mockResolvedValue({ processed: 4, skipped: 0, failed: 0 });
    mockDeliverNotifications.mockResolvedValue({ delivered: 7, skipped: 0, failed: 0 });

    const { GET } = await import("../route");
    const res = await GET(makeRequest());

    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      finalized: 4,
      delivered: 7,
      failed: 0,
    });
  });
});
