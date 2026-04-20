import { describe, it, expectTypeOf } from "vitest";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

describe("next-auth module augmentation", () => {
  it("declares custom Session.user fields (tier, subscription, unit, rest)", () => {
    expectTypeOf<Session["user"]>().toMatchTypeOf<{
      id: string;
      tier: string;
      subscriptionStatus: string;
      unitSystem: string;
      onboardingComplete: boolean;
      defaultRestSeconds: number;
    }>();
  });

  it("declares custom JWT fields mirroring Session.user", () => {
    expectTypeOf<JWT>().toMatchTypeOf<{
      id?: string;
      tier?: string;
      subscriptionStatus?: string;
      unitSystem?: string;
      onboardingComplete?: boolean;
      defaultRestSeconds?: number;
    }>();
  });
});
