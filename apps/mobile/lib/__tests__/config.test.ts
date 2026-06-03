import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Config", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  describe("API_URL", () => {
    it("uses API_URL when set", async () => {
      vi.stubEnv("API_URL", "http://localhost:3000");
      vi.stubEnv("EXPO_PUBLIC_API_URL", "http://expo:3000");
      const { Config } = await import("../config");
      expect(Config.API_URL).toBe("http://localhost:3000");
    });

    it("falls back to EXPO_PUBLIC_API_URL when API_URL is absent", async () => {
      vi.stubEnv("EXPO_PUBLIC_API_URL", "http://expo-fallback:3000");
      const { Config } = await import("../config");
      expect(Config.API_URL).toBe("http://expo-fallback:3000");
    });

    it("falls back to the default production URL when neither env var is set", async () => {
      const { Config } = await import("../config");
      expect(Config.API_URL).toBe("https://ironpulse.hiten-patel.co.uk");
    });
  });

  describe("GOOGLE_CLIENT_ID", () => {
    it("uses GOOGLE_CLIENT_ID when set", async () => {
      vi.stubEnv("GOOGLE_CLIENT_ID", "my-client-id.apps.googleusercontent.com");
      const { Config } = await import("../config");
      expect(Config.GOOGLE_CLIENT_ID).toBe("my-client-id.apps.googleusercontent.com");
    });

    it("falls back to EXPO_PUBLIC_GOOGLE_CLIENT_ID when GOOGLE_CLIENT_ID is absent", async () => {
      vi.stubEnv("EXPO_PUBLIC_GOOGLE_CLIENT_ID", "expo-client-id");
      const { Config } = await import("../config");
      expect(Config.GOOGLE_CLIENT_ID).toBe("expo-client-id");
    });

    it("defaults to an empty string when neither env var is set", async () => {
      const { Config } = await import("../config");
      expect(Config.GOOGLE_CLIENT_ID).toBe("");
    });
  });

  describe("E2E", () => {
    it("is true when E2E is '1'", async () => {
      vi.stubEnv("E2E", "1");
      const { Config } = await import("../config");
      expect(Config.E2E).toBe(true);
    });

    it("is true when EXPO_PUBLIC_E2E is '1' and E2E is absent", async () => {
      vi.stubEnv("EXPO_PUBLIC_E2E", "1");
      const { Config } = await import("../config");
      expect(Config.E2E).toBe(true);
    });

    it("is false when E2E is any value other than '1'", async () => {
      vi.stubEnv("E2E", "0");
      const { Config } = await import("../config");
      expect(Config.E2E).toBe(false);
    });

    it("is false when neither env var is set", async () => {
      const { Config } = await import("../config");
      expect(Config.E2E).toBe(false);
    });
  });
});
