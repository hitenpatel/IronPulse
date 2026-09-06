import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockDeleteMany = vi.fn();
const mockWebhookDeleteMany = vi.fn();
const mockPrismaInstance = {
  magicLinkToken: { deleteMany: mockDeleteMany },
  emailChangeToken: { deleteMany: mockDeleteMany },
  passwordResetToken: { deleteMany: mockDeleteMany },
  passkeyChallenge: { deleteMany: mockDeleteMany },
  webhookEvent: { deleteMany: mockWebhookDeleteMany },
};

vi.mock("@zor/db", () => ({
  PrismaClient: vi.fn(() => mockPrismaInstance),
}));

vi.mock("@zor/api/src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

const SECRET = "test-cron-secret";

function makeRequest(opts: { authorization?: string; secret?: string } = {}) {
  const auth =
    opts.authorization !== undefined
      ? opts.authorization
      : `Bearer ${opts.secret ?? SECRET}`;
  return new Request("https://example/api/cron/cleanup-tokens", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("POST /api/cron/cleanup-tokens", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    mockDeleteMany.mockResolvedValue({ count: 0 });
    mockWebhookDeleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when the authorization header is missing", async () => {
    const { POST } = await import("../route");
    const req = new Request("https://example/api/cron/cleanup-tokens", {
      method: "POST",
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when the bearer token is wrong", async () => {
    const { POST } = await import("../route");
    const res = await POST(makeRequest({ secret: "wrong-secret" }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 401 when CRON_SECRET is not configured", async () => {
    vi.unstubAllEnvs();
    const { POST } = await import("../route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 200 and counts when all deletions succeed", async () => {
    mockDeleteMany
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 5 })
      .mockResolvedValueOnce({ count: 0 });

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deleted.magicLinkToken).toBe(3);
    expect(body.deleted.emailChangeToken).toBe(1);
    expect(body.deleted.passwordResetToken).toBe(5);
    expect(body.deleted.passkeyChallenge).toBe(0);
    expect(body.errors).toEqual({});
  });

  it("returns 200 with zero counts when no expired tokens exist", async () => {
    mockDeleteMany.mockResolvedValue({ count: 0 });

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Object.values(body.deleted).every((v) => v === 0)).toBe(true);
  });

  it("returns 207 and records the error when one table deletion fails", async () => {
    mockDeleteMany
      .mockResolvedValueOnce({ count: 2 })
      .mockRejectedValueOnce(new Error("deadlock detected"))
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.deleted.magicLinkToken).toBe(2);
    expect(body.deleted.emailChangeToken).toBe(0);
    expect(body.errors.emailChangeToken).toBe("deadlock detected");
    expect(body.deleted.passwordResetToken).toBe(1);
  });

  it("returns 207 when all tables fail and records every error", async () => {
    mockDeleteMany.mockRejectedValue(new Error("connection lost"));

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(Object.keys(body.errors)).toHaveLength(4);
    expect(Object.values(body.deleted).every((v) => v === 0)).toBe(true);
  });

  it("calls captureError for each failed table", async () => {
    const { captureError } = await import(
      "@zor/api/src/lib/capture-error"
    );
    mockDeleteMany.mockRejectedValue(new Error("timeout"));

    const { POST } = await import("../route");
    await POST(makeRequest());

    expect(captureError).toHaveBeenCalledTimes(4);
    expect(captureError).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ context: "cron.cleanup-tokens" }),
    );
  });

  it("deletes succeeded webhook_events older than 30 days", async () => {
    mockWebhookDeleteMany
      .mockResolvedValueOnce({ count: 1 }) // succeeded
      .mockResolvedValueOnce({ count: 0 }); // skipped_no_connection

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted.webhookEventSucceeded).toBe(1);
    expect(mockWebhookDeleteMany).toHaveBeenNthCalledWith(1, {
      where: { status: "succeeded", completedAt: { lt: expect.any(Date) } },
    });
  });

  it("deletes skipped_no_connection webhook_events older than 30 days", async () => {
    mockWebhookDeleteMany
      .mockResolvedValueOnce({ count: 0 }) // succeeded
      .mockResolvedValueOnce({ count: 1 }); // skipped_no_connection

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.deleted.webhookEventSkipped).toBe(1);
    expect(mockWebhookDeleteMany).toHaveBeenNthCalledWith(2, {
      where: {
        status: "skipped_no_connection",
        completedAt: { lt: expect.any(Date) },
      },
    });
  });

  it("only targets succeeded and skipped_no_connection webhook_events, never dlq", async () => {
    const { POST } = await import("../route");
    await POST(makeRequest());

    expect(mockWebhookDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "succeeded" }),
      }),
    );
    expect(mockWebhookDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "skipped_no_connection" }),
      }),
    );
    expect(mockWebhookDeleteMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "dlq" }),
      }),
    );
  });

  it("handles non-Error rejection values gracefully", async () => {
    mockDeleteMany
      .mockResolvedValueOnce({ count: 0 })
      .mockRejectedValueOnce("string error")
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 0 });

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(207);
    const body = await res.json();
    expect(body.errors.emailChangeToken).toBe("string error");
  });
});
