import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockFindMany = vi.fn();
const mockDeleteMany = vi.fn();
const mockPrismaInstance = {
  user: { findMany: mockFindMany, deleteMany: mockDeleteMany },
};

vi.mock("@ironpulse/db", () => ({
  PrismaClient: vi.fn(() => mockPrismaInstance),
}));

const SECRET = "test-cron-secret";

function makeRequest(opts: { authorization?: string; secret?: string } = {}) {
  const auth =
    opts.authorization !== undefined
      ? opts.authorization
      : `Bearer ${opts.secret ?? SECRET}`;
  return new Request("https://example/api/cron/process-deletions", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("POST /api/cron/process-deletions", () => {
  beforeEach(() => {
    vi.stubEnv("CRON_SECRET", SECRET);
    mockFindMany.mockResolvedValue([]);
    mockDeleteMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns 401 when authorization header is missing", async () => {
    const { POST } = await import("../route");
    const req = new Request("https://example/api/cron/process-deletions", {
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
    const body = await res.json();
    expect(body.error).toBe("unauthorized");
  });

  it("returns 200 with deletedCount 0 when no users are pending deletion", async () => {
    mockFindMany.mockResolvedValue([]);
    const { POST } = await import("../route");
    const res = await POST(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deletedCount).toBe(0);
    expect(mockDeleteMany).not.toHaveBeenCalled();
  });

  it("deletes eligible users and returns the correct count", async () => {
    const users = [{ id: "user-1" }, { id: "user-2" }, { id: "user-3" }];
    mockFindMany.mockResolvedValue(users);
    mockDeleteMany.mockResolvedValue({ count: 3 });

    const { POST } = await import("../route");
    const res = await POST(makeRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.deletedCount).toBe(3);

    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["user-1", "user-2", "user-3"] } },
    });
  });

  it("queries only users whose deletion was requested 7+ days ago", async () => {
    const before = Date.now();
    const { POST } = await import("../route");
    await POST(makeRequest());
    const after = Date.now();

    const [[{ where }]] = mockFindMany.mock.calls;
    const cutoff: Date = where.deletionRequestedAt.lte;

    expect(cutoff).toBeInstanceOf(Date);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(cutoff.getTime()).toBeGreaterThanOrEqual(before - sevenDaysMs - 100);
    expect(cutoff.getTime()).toBeLessThanOrEqual(after - sevenDaysMs + 100);
    expect(where.deletionRequestedAt.not).toBeNull();
  });
});
