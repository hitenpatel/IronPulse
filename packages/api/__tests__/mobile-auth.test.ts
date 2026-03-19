import { describe, it, expect } from "vitest";
import { signMobileToken, verifyMobileToken } from "../src/lib/mobile-auth";
import type { SessionUser } from "@ironpulse/shared";

const testUser: SessionUser = {
  id: "user-123",
  email: "test@example.com",
  name: "Test User",
  tier: "athlete",
  subscriptionStatus: "none",
  unitSystem: "metric",
  onboardingComplete: true,
  defaultRestSeconds: 90,
};

describe("signMobileToken", () => {
  it("returns a JWT string", () => {
    const token = signMobileToken(testUser);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });
});

describe("verifyMobileToken", () => {
  it("round-trips: sign then verify returns the user", () => {
    const token = signMobileToken(testUser);
    const result = verifyMobileToken(token);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("user-123");
    expect(result!.email).toBe("test@example.com");
  });

  it("returns null for invalid tokens", () => {
    expect(verifyMobileToken("invalid.token.here")).toBeNull();
  });
});
