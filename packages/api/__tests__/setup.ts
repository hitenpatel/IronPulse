import { vi } from "vitest";

// Mock rate-limit globally to avoid Redis dependency in integration tests
vi.mock("../src/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(undefined),
  RATE_LIMITS: {
    api: { windowMs: 60_000, maxRequests: 100 },
    upload: { windowMs: 3_600_000, maxRequests: 10 },
    auth: { windowMs: 60_000, maxRequests: 5 },
    passkeyReg: { windowMs: 3_600_000, maxRequests: 5 },
  },
}));
