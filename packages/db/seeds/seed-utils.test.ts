import { describe, expect, it } from "vitest";
import { resolveSeedPassword, shouldSkipDevSeed } from "./seed-utils";

describe("resolveSeedPassword", () => {
  it("uses SEED_USER_PASSWORD when set", () => {
    expect(resolveSeedPassword({ SEED_USER_PASSWORD: "s3cret" })).toBe("s3cret");
  });
  it("falls back to password123 for dev", () => {
    expect(resolveSeedPassword({})).toBe("password123");
  });
});

describe("shouldSkipDevSeed", () => {
  it("skips when sample data exists", () => {
    expect(shouldSkipDevSeed(5, {})).toBe(true);
  });
  it("runs on empty database", () => {
    expect(shouldSkipDevSeed(0, {})).toBe(false);
  });
  it("SEED_DEV_FORCE=1 overrides the skip", () => {
    expect(shouldSkipDevSeed(5, { SEED_DEV_FORCE: "1" })).toBe(false);
  });
});
