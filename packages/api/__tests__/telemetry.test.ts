import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/lib/capture-error", () => ({
  captureError: vi.fn(),
}));

import { telemetryRouter } from "../src/routers/telemetry";
import { createCallerFactory, createTRPCContext } from "../src/trpc";
import { createTestUser } from "./helpers";
import { captureError } from "../src/lib/capture-error";

const mockCapture = vi.mocked(captureError);
const createCaller = createCallerFactory(telemetryRouter);

// No real DB required — the router only touches capture-error, not Prisma.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fakeDb = {} as any;

function caller(session: { user: ReturnType<typeof createTestUser> } | null = null) {
  return createCaller(createTRPCContext({ db: fakeDb, session }));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("telemetry.reportClientError", () => {
  it("forwards the error plus context to captureError", async () => {
    const user = createTestUser({ email: "t@example.com" });
    const result = await caller({ user }).reportClientError({
      message: "boom",
      stack: "Error: boom\n    at foo (/foo.ts:1:1)",
      context: { screen: "Dashboard", op: "fetchWeekly" },
    });

    expect(result).toEqual({ ok: true });
    expect(mockCapture).toHaveBeenCalledTimes(1);
    const [err, ctx] = mockCapture.mock.calls[0]!;
    expect((err as Error).message).toBe("boom");
    expect((err as Error).stack).toContain("Error: boom");
    expect(ctx).toMatchObject({
      source: "mobile",
      userId: user.id,
      screen: "Dashboard",
      op: "fetchWeekly",
    });
  });

  it("rejects empty messages (zod min(1))", async () => {
    const user = createTestUser({ email: "t2@example.com" });
    await expect(
      caller({ user }).reportClientError({ message: "" } as never),
    ).rejects.toThrow();
  });

  it("requires authentication", async () => {
    await expect(
      caller(null).reportClientError({ message: "x" }),
    ).rejects.toThrow("UNAUTHORIZED");
  });
});
