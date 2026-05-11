import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Dynamic imports inside the route are also intercepted by vi.mock.
vi.mock("@ironpulse/db", () => ({
  db: { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) },
}));
vi.mock("@ironpulse/api/src/lib/redis", () => ({
  getRedis: vi.fn(() => ({ ping: vi.fn().mockResolvedValue("PONG") })),
}));

describe("GET /api/health", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns 200 and status=ok when db, redis, and s3 are all healthy", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response),
    );

    const { GET } = await import("../route");
    const res = await GET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.services.db.status).toBe("ok");
    expect(body.services.redis.status).toBe("ok");
    expect(body.services.s3.status).toBe("ok");
  });

  it("returns 200 and status=degraded when s3 is unavailable but db and redis are healthy", async () => {
    // S3 (MinIO) is not provisioned in CI — fetch throws a connection error.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("connect ECONNREFUSED 127.0.0.1:9000")),
    );

    const { GET } = await import("../route");
    const res = await GET();

    // The HTTP status must be 200 so the CI startup health-check loop exits
    // promptly rather than waiting the full 120-second timeout. DB + Redis
    // healthy means the server is ready to accept requests.
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("degraded");
    expect(body.services.db.status).toBe("ok");
    expect(body.services.redis.status).toBe("ok");
    expect(body.services.s3.status).toBe("error");
  });

  it("returns 503 when the database is unavailable", async () => {
    vi.mocked(
      (await import("@ironpulse/db")).db.$queryRaw as ReturnType<typeof vi.fn>,
    ).mockRejectedValueOnce(new Error("Connection refused"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response),
    );

    const { GET } = await import("../route");
    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.services.db.status).toBe("error");
  });

  it("returns 503 when redis is unavailable", async () => {
    vi.mocked(
      (await import("@ironpulse/api/src/lib/redis")).getRedis as ReturnType<typeof vi.fn>,
    ).mockReturnValueOnce({
      ping: vi.fn().mockRejectedValue(new Error("Redis down")),
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response),
    );

    const { GET } = await import("../route");
    const res = await GET();

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.services.redis.status).toBe("error");
  });
});
