import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const createExpoConfig = require("../../app.config.js");

describe("mobile identity configuration", () => {
  it("uses canonical Zor presentation with immutable application IDs", () => {
    const config = createExpoConfig({ config: { name: "", slug: "" } });

    expect(config.name).toBe("Zor");
    expect(config.slug).toBe("zor");
    expect(config.scheme).toEqual(["zor"]);
    expect(config.android.package).toBe("com.ironpulse.app");
    expect(config.ios.bundleIdentifier).toBe("com.ironpulse.app");
    expect(config.extra.eas.projectId).toBe("a4541ea9-4c09-42bf-8ae6-f12a5ebb81e3");
  });

  it("keeps React Native CLI native tooling on the immutable shipping package", () => {
    const source = readFileSync(join(__dirname, "..", "..", "react-native.config.js"), "utf8");

    expect(source).toContain("packageName: 'com.ironpulse.app'");
    expect(source).not.toContain("packageName: 'com.zor.app'");
  });
});
