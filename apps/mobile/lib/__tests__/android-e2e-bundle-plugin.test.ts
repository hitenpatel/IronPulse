import { describe, expect, it } from "vitest";
import { patchAppBuildGradle } from "../../plugins/android-e2e-bundle.js";

const PREBUILD_GRADLE = `apply plugin: "com.facebook.react"

react {
    entryFile = file(["node", "-e", "require('expo/scripts/resolveAppEntry')", rootDir.getAbsoluteFile().getParentFile().getAbsolutePath(), "android", "absolute"].execute(null, rootDir).text.trim())
    bundleCommand = "export:embed"

    /* Variants */
    //   The list of variants to that are debuggable. For those we're going to
    //   skip the bundling of the JS bundle and the assets. By default is just 'debug'.
    //   If you add flavors like lite, prod, etc. you'll have to list your debuggableVariants.
    // debuggableVariants = ["liteDebug", "prodDebug"]

    /* Bundling */
    // nodeExecutableAndArgs = ["node"]
}

android {
    namespace 'com.ironpulse.app'
}
`;

describe("android-e2e-bundle plugin", () => {
  it("uncomments debuggableVariants and empties it so debug bundles JS", () => {
    const out = patchAppBuildGradle(PREBUILD_GRADLE);
    expect(out).toMatch(/^\s*debuggableVariants = \[\]$/m);
    expect(out).not.toMatch(/\/\/\s*debuggableVariants/);
    // the rest of the react block is untouched
    expect(out).toContain('bundleCommand = "export:embed"');
  });

  it("is idempotent", () => {
    const once = patchAppBuildGradle(PREBUILD_GRADLE);
    expect(patchAppBuildGradle(once)).toBe(once);
  });

  it("injects into a react block that has no commented default", () => {
    const gradle = `react {\n    bundleCommand = "export:embed"\n}\n`;
    const out = patchAppBuildGradle(gradle);
    expect(out).toBe(
      `react {\n    debuggableVariants = []\n    bundleCommand = "export:embed"\n}\n`,
    );
  });

  it("throws when there is no react block to patch", () => {
    expect(() => patchAppBuildGradle("android {\n}\n")).toThrow(
      /could not find `react \{` block/,
    );
  });
});
