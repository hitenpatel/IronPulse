import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Config.API_URL", () => {
  it("defaults to the production URL when no env vars are set", async () => {
    const { Config } = await import("../config");
    expect(Config.API_URL).toBe("https://ironpulse.hiten-patel.co.uk");
  });

  it("reads from API_URL when set", async () => {
    vi.stubEnv("API_URL", "http://localhost:3000");
    const { Config } = await import("../config");
    expect(Config.API_URL).toBe("http://localhost:3000");
  });

  it("falls back to EXPO_PUBLIC_API_URL when API_URL is absent", async () => {
    vi.stubEnv("EXPO_PUBLIC_API_URL", "http://192.168.1.100:3000");
    const { Config } = await import("../config");
    expect(Config.API_URL).toBe("http://192.168.1.100:3000");
  });

  it("prefers API_URL over EXPO_PUBLIC_API_URL", async () => {
    vi.stubEnv("API_URL", "http://primary:3000");
    vi.stubEnv("EXPO_PUBLIC_API_URL", "http://fallback:3000");
    const { Config } = await import("../config");
    expect(Config.API_URL).toBe("http://primary:3000");
  });
});

describe("Config.GOOGLE_CLIENT_ID", () => {
  it("defaults to empty string when no env vars are set", async () => {
    const { Config } = await import("../config");
    expect(Config.GOOGLE_CLIENT_ID).toBe("");
  });

  it("reads from GOOGLE_CLIENT_ID when set", async () => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "goog-client-123");
    const { Config } = await import("../config");
    expect(Config.GOOGLE_CLIENT_ID).toBe("goog-client-123");
  });

  it("falls back to EXPO_PUBLIC_GOOGLE_CLIENT_ID when GOOGLE_CLIENT_ID is absent", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID", "expo-goog-456");
    const { Config } = await import("../config");
    expect(Config.GOOGLE_CLIENT_ID).toBe("expo-goog-456");
  });
});

describe("Config.E2E", () => {
  it("is false by default", async () => {
    const { Config } = await import("../config");
    expect(Config.E2E).toBe(false);
  });

  it("is true when E2E is set to '1'", async () => {
    vi.stubEnv("E2E", "1");
    const { Config } = await import("../config");
    expect(Config.E2E).toBe(true);
  });

  it("is true when EXPO_PUBLIC_E2E is set to '1' and E2E is absent", async () => {
    vi.stubEnv("EXPO_PUBLIC_E2E", "1");
    const { Config } = await import("../config");
    expect(Config.E2E).toBe(true);
  });

  it("is false when E2E is set to a truthy string other than '1'", async () => {
    vi.stubEnv("E2E", "true");
    const { Config } = await import("../config");
    expect(Config.E2E).toBe(false);
  });

  it("prefers E2E over EXPO_PUBLIC_E2E", async () => {
    vi.stubEnv("E2E", "1");
    vi.stubEnv("EXPO_PUBLIC_E2E", "0");
    const { Config } = await import("../config");
    expect(Config.E2E).toBe(true);
  });
});
