import { readFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const createExpoConfig = require("../../app.config.js");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const identity = require("../../../../packages/shared/src/identity.json");

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

  it("keeps database filename literals inside the exact migration boundary", () => {
    const root = join(__dirname, "..", "..", "..", "..");
    const files = execFileSync(
      "git",
      ["ls-files", "--cached", "--others", "--exclude-standard", "apps/mobile"],
      { cwd: root, encoding: "utf8" },
    )
      .trim()
      .split("\n")
      .filter(Boolean);
    const allowed = new Set([
      "apps/mobile/lib/database-readiness.ts",
      "apps/mobile/lib/__tests__/database-readiness.test.ts",
      "apps/mobile/lib/__tests__/startup.test.ts",
      "apps/mobile/modules/zor-database-files/src/ZorDatabaseFiles.types.ts",
      "apps/mobile/modules/zor-database-files/android/src/main/java/com/zor/databasefiles/ZorDatabaseFilesModule.kt",
      "apps/mobile/modules/zor-database-files/ios/ZorDatabaseFilesModule.swift",
    ]);
    const offenders = files.filter((path) => {
      if (allowed.has(path) || !/\.(?:ts|tsx|js|jsx|kt|swift|json)$/u.test(path)) return false;
      const filenamePattern = new RegExp(`(?:${identity.migrationOnly.service}|zor)\\.db`, "u");
      return filenamePattern.test(readFileSync(join(root, path), "utf8"));
    });

    expect(offenders).toEqual([]);
  });
});
