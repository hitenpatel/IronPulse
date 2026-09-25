import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  parseScope,
  validateBrandingAssetContract,
  validateExpoVariants,
} from "./validate-zor-identity.mjs";

const identity = JSON.parse(
  readFileSync(new URL("../packages/shared/src/identity.json", import.meta.url), "utf8"),
);

test("scope defaults to all and rejects unknown values", () => {
  assert.equal(parseScope([]), "all");
  assert.equal(parseScope(["--scope", "product"]), "product");
  assert.throws(() => parseScope(["--scope", "unknown"]), /product\|infra\|all/u);
});

test("Expo validation evaluates production and E2E while restoring the environment", () => {
  const original = process.env.EXPO_PUBLIC_E2E;
  process.env.EXPO_PUBLIC_E2E = "keep-me";
  const observed = [];

  const errors = validateExpoVariants(identity, ({ config }) => {
    observed.push({ env: process.env.EXPO_PUBLIC_E2E, config });
    const e2e = process.env.EXPO_PUBLIC_E2E === "1";
    return {
      ...config,
      name: e2e ? "Zor E2E" : "Zor",
      slug: "zor",
      scheme: ["zor"],
      ios: { bundleIdentifier: identity.immutableCompatibility.applicationIds[Number(e2e)] },
      android: { package: identity.immutableCompatibility.applicationIds[Number(e2e)] },
      extra: { eas: { projectId: identity.mobile.easProjectId } },
    };
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(observed, [
    { env: "0", config: { name: "", slug: "" } },
    { env: "1", config: { name: "", slug: "" } },
  ]);
  assert.equal(process.env.EXPO_PUBLIC_E2E, "keep-me");
  if (original === undefined) delete process.env.EXPO_PUBLIC_E2E;
  else process.env.EXPO_PUBLIC_E2E = original;
});

test("asset validation rejects a manifest generated for a different identity", () => {
  const errors = validateBrandingAssetContract(
    { ...identity, product: { ...identity.product, displayName: "Not Zor" } },
    {
      generator: "zor-assets-v1",
      outputs: { "assets/branding/generated/zor-mark-16.png": {} },
    },
    ["assets/branding/svg/zor-mark.svg"],
  );
  assert.match(errors.join("\n"), /display name must be Zor/u);
});

test("asset validation rejects non-canonical generator and branding paths", () => {
  const errors = validateBrandingAssetContract(
    identity,
    {
      generator: "legacy-assets-v1",
      outputs: { [`assets/branding/generated/${identity.migrationOnly.service}-mark.png`]: {} },
    },
    [`assets/branding/svg/${identity.migrationOnly.service}-mark.svg`],
  );
  assert.match(errors.join("\n"), /zor-assets-v1/u);
  assert.match(errors.join("\n"), new RegExp(`${identity.migrationOnly.service}-mark`, "u"));
});
