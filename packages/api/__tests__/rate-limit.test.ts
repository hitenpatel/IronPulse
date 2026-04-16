import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

const mockExec = vi.fn();
const mockPipeline = vi.fn(() => ({
  zremrangebyscore: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  pexpire: vi.fn().mockReturnThis(),
  exec: mockExec,
}));

vi.mock("../src/lib/redis", () => ({
  getRedis: vi.fn(() => ({
    pipeline: mockPipeline,
  })),
}));

// The global setup.ts mocks rate-limit itself, but we import the real module
// here via vi.unmock so our tests exercise the actual implementation.
vi.unmock("../src/lib/rate-limit");

import { checkRateLimit, RATE_LIMITS } from "../src/lib/rate-limit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("RATE_LIMITS", () => {
  it("contains expected keys", () => {
    expect(RATE_LIMITS).toHaveProperty("api");
    expect(RATE_LIMITS).toHaveProperty("upload");
    expect(RATE_LIMITS).toHaveProperty("auth");
    expect(RATE_LIMITS).toHaveProperty("passkeyReg");
  });

  it("each limit has windowMs and maxRequests", () => {
    for (const config of Object.values(RATE_LIMITS)) {
      expect(config).toHaveProperty("windowMs");
      expect(config).toHaveProperty("maxRequests");
      expect(typeof config.windowMs).toBe("number");
      expect(typeof config.maxRequests).toBe("number");
    }
  });
});

describe("checkRateLimit", () => {
  it("does not throw when count is within limit", async () => {
    mockExec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 5],
      [null, 1],
    ]);

    await expect(
      checkRateLimit("test:user1", { windowMs: 60_000, maxRequests: 100 }),
    ).resolves.toBeUndefined();
  });

  it("does not throw when count equals maxRequests", async () => {
    mockExec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 100],
      [null, 1],
    ]);

    await expect(
      checkRateLimit("test:user2", { windowMs: 60_000, maxRequests: 100 }),
    ).resolves.toBeUndefined();
  });

  it("throws TRPCError with TOO_MANY_REQUESTS when count exceeds limit", async () => {
    mockExec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 101],
      [null, 1],
    ]);

    await expect(
      checkRateLimit("test:user3", { windowMs: 60_000, maxRequests: 100 }),
    ).rejects.toThrow(TRPCError);

    try {
      await checkRateLimit("test:user3", { windowMs: 60_000, maxRequests: 100 });
    } catch (e) {
      expect(e).toBeInstanceOf(TRPCError);
      expect((e as TRPCError).code).toBe("TOO_MANY_REQUESTS");
    }
  });

  it("calls pipeline commands in order", async () => {
    mockExec.mockResolvedValue([
      [null, 0],
      [null, 1],
      [null, 1],
      [null, 1],
    ]);

    await checkRateLimit("test:order", { windowMs: 60_000, maxRequests: 100 });

    expect(mockPipeline).toHaveBeenCalledTimes(1);
    const pipe = mockPipeline.mock.results[0].value;
    expect(pipe.zremrangebyscore).toHaveBeenCalled();
    expect(pipe.zadd).toHaveBeenCalled();
    expect(pipe.zcard).toHaveBeenCalled();
    expect(pipe.pexpire).toHaveBeenCalled();
  });
});
