import { describe, it, expect } from "vitest";
import { CACHE } from "../src/lib/s3";

describe("s3 CACHE profiles — CDN headers", () => {
  it("immutable is a 1-year max-age with immutable hint", () => {
    expect(CACHE.immutable).toContain("max-age=31536000");
    expect(CACHE.immutable).toContain("immutable");
    expect(CACHE.immutable).toContain("public");
  });

  it("longLived has a shorter browser max-age but a longer shared cache", () => {
    expect(CACHE.longLived).toContain("max-age=86400"); // 1 day browser
    expect(CACHE.longLived).toContain("s-maxage=2592000"); // 30d CDN
    expect(CACHE.longLived).toContain("public");
  });

  it("shortLived keeps a minimal browser ttl for near-realtime resources", () => {
    expect(CACHE.shortLived).toMatch(/max-age=(300|600)/);
    expect(CACHE.shortLived).toContain("public");
  });
});
