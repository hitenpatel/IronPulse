import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("env", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("env.NEXTAUTH_SECRET throws when not set", async () => {
    delete process.env.NEXTAUTH_SECRET;
    const { env } = await import("../src/lib/env");
    expect(() => env.NEXTAUTH_SECRET).toThrow(
      "Missing required environment variable: NEXTAUTH_SECRET",
    );
  });

  it("env.NEXTAUTH_SECRET returns value when set", async () => {
    process.env.NEXTAUTH_SECRET = "test-secret-value";
    const { env } = await import("../src/lib/env");
    expect(env.NEXTAUTH_SECRET).toBe("test-secret-value");
  });

  it("env.NEXTAUTH_URL returns default when not set", async () => {
    delete process.env.NEXTAUTH_URL;
    const { env } = await import("../src/lib/env");
    expect(env.NEXTAUTH_URL).toBe("http://localhost:3000");
  });

  it("env.REDIS_URL returns default when not set", async () => {
    delete process.env.REDIS_URL;
    const { env } = await import("../src/lib/env");
    expect(env.REDIS_URL).toBe("redis://localhost:6379");
  });

  it("env.STRIPE_SECRET_KEY returns undefined when not set", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { env } = await import("../src/lib/env");
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });
});

describe("requireIntegrationCredentials", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns credentials when both are set", async () => {
    process.env.GARMIN_CLIENT_ID = "garmin-id";
    process.env.GARMIN_CLIENT_SECRET = "garmin-secret";
    const { requireIntegrationCredentials } = await import("../src/lib/env");
    const result = requireIntegrationCredentials("GARMIN");
    expect(result).toEqual({ clientId: "garmin-id", clientSecret: "garmin-secret" });
  });

  it("throws when client ID is missing", async () => {
    delete process.env.STRAVA_CLIENT_ID;
    process.env.STRAVA_CLIENT_SECRET = "secret";
    const { requireIntegrationCredentials } = await import("../src/lib/env");
    expect(() => requireIntegrationCredentials("STRAVA")).toThrow(
      "STRAVA integration requires STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET",
    );
  });

  it("throws when client secret is missing", async () => {
    process.env.WITHINGS_CLIENT_ID = "id";
    delete process.env.WITHINGS_CLIENT_SECRET;
    const { requireIntegrationCredentials } = await import("../src/lib/env");
    expect(() => requireIntegrationCredentials("WITHINGS")).toThrow(
      "WITHINGS integration requires WITHINGS_CLIENT_ID and WITHINGS_CLIENT_SECRET",
    );
  });

  it("throws when both are missing", async () => {
    delete process.env.OURA_CLIENT_ID;
    delete process.env.OURA_CLIENT_SECRET;
    const { requireIntegrationCredentials } = await import("../src/lib/env");
    expect(() => requireIntegrationCredentials("OURA")).toThrow(
      "OURA integration requires OURA_CLIENT_ID and OURA_CLIENT_SECRET",
    );
  });
});
