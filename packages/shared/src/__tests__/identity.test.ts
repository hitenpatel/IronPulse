import { describe, expect, it } from "vitest";

import {
  CANONICAL_ORIGINS,
  IDENTITY,
  IMMUTABLE_APPLICATION_IDS,
  MIGRATION_ONLY_ORIGINS,
} from "../identity";

describe("canonical Zor identity", () => {
  it("publishes the approved mutable product and infrastructure identifiers", () => {
    expect(IDENTITY.product).toEqual({
      displayName: "Zor",
      storeName: "Zor Fitness",
    });
    expect(CANONICAL_ORIGINS).toEqual({
      production: "https://zor.hiten-patel.co.uk",
      staging: "https://staging.zor.hiten-patel.co.uk",
      development: "https://zor.local",
    });
    expect(IDENTITY.repositories).toEqual({
      forgejo: "hiten/Zor",
      github: "hitenpatel/Zor",
      image: "git.hiten-patel.co.uk/hiten/zor",
    });
    expect(IDENTITY.infrastructure).toMatchObject({
      composeProduction: "zor-prod",
      composeStaging: "zor-staging",
      service: "zor",
      postgresRole: "zor",
      postgresDatabase: "zor",
      postgresTestDatabase: "zor_test",
      minioBucket: "zor",
      backupPrefix: "zor_",
      deployLock: "/tmp/zor-deploy.lock",
    });
    expect(IDENTITY.mobile.powerSyncDatabase).toBe("zor.db");
    expect(IDENTITY.mobile.deepLinkSchemes).toEqual(["zor"]);
  });

  it("retains only the approved immutable application and store identities", () => {
    expect(IMMUTABLE_APPLICATION_IDS).toEqual([
      "com.ironpulse.app",
      "com.ironpulse.app.e2e",
    ]);
    expect(IDENTITY.immutableCompatibility.iapProductIds).toEqual([
      "com.ironpulse.athlete.monthly",
      "com.ironpulse.athlete.yearly",
      "com.ironpulse.coach.monthly",
      "com.ironpulse.coach.yearly",
    ]);
    expect(IDENTITY.mobile.easProjectId).toBe(
      "a4541ea9-4c09-42bf-8ae6-f12a5ebb81e3",
    );
  });

  it("maps only the four approved legacy managed origins", () => {
    expect(MIGRATION_ONLY_ORIGINS).toEqual({
      "https://ironpulse.hiten-patel.co.uk":
        "https://zor.hiten-patel.co.uk",
      "https://staging.ironpulse.hiten-patel.co.uk":
        "https://staging.zor.hiten-patel.co.uk",
      "https://mettlelift.hiten-patel.co.uk":
        "https://zor.hiten-patel.co.uk",
      "https://staging.mettlelift.hiten-patel.co.uk":
        "https://staging.zor.hiten-patel.co.uk",
    });
  });

  it("is deeply frozen so runtime consumers cannot drift from the manifest", () => {
    expect(Object.isFrozen(IDENTITY)).toBe(true);
    expect(Object.isFrozen(IDENTITY.mobile.deepLinkSchemes)).toBe(true);
    expect(Object.isFrozen(IDENTITY.migrationOnly.legacyOrigins)).toBe(true);
  });
});
