import fs from "fs";
import path from "path";
import { describe, it, expect, vi } from "vitest";
import { captureError } from "../src/lib/capture-error";

describe("captureError", () => {
  it("does not throw when @sentry/nextjs is unavailable", async () => {
    // The dynamic import of @sentry/nextjs will fail in the test environment
    // because it is not installed in the api package. captureError must swallow
    // that error silently.
    await expect(
      captureError(new Error("test"), { provider: "strava" }),
    ).resolves.toBeUndefined();
  });

  it("calls Sentry.captureException when Sentry is available", async () => {
    const mockCaptureException = vi.fn();

    // Mock the dynamic import to return a fake Sentry module
    vi.doMock("@sentry/nextjs", () => ({
      captureException: mockCaptureException,
    }));

    // Re-import to pick up the mock — but captureError uses a dynamic import()
    // internally so we need to clear the module cache first
    const { captureError: freshCaptureError } = await import(
      "../src/lib/capture-error"
    );

    const err = new Error("something broke");
    await freshCaptureError(err, { provider: "garmin", activityId: "42" });

    expect(mockCaptureException).toHaveBeenCalledWith(err, {
      extra: { provider: "garmin", activityId: "42" },
    });

    vi.doUnmock("@sentry/nextjs");
  });
});

describe(".env.example Sentry variables", () => {
  const envExample = fs.readFileSync(
    path.resolve(__dirname, "../../../.env.example"),
    "utf-8",
  );

  it.each(["NEXT_PUBLIC_SENTRY_DSN", "SENTRY_ORG", "SENTRY_PROJECT"])(
    "contains %s",
    (variable) => {
      expect(envExample).toContain(variable);
    },
  );
});
