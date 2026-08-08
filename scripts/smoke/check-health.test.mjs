import { describe, expect, it } from "vitest";
import { assertHealth } from "./check-health.mjs";

const ok = {
  status: "ok",
  sha: "abc1234",
  services: { db: { status: "ok" }, redis: { status: "ok" }, s3: { status: "ok" } },
};

describe("assertHealth", () => {
  it("passes on matching sha with healthy criticals", () => {
    expect(() => assertHealth(ok, "abc1234")).not.toThrow();
  });
  it("fails on sha mismatch (wrong revision deployed)", () => {
    expect(() => assertHealth(ok, "def5678")).toThrow(/sha/i);
  });
  it("fails when db or redis is down", () => {
    const bad = { ...ok, services: { ...ok.services, db: { status: "error" } } };
    expect(() => assertHealth(bad, "abc1234")).toThrow(/db/i);
  });
  it("tolerates degraded s3 (matches health route policy)", () => {
    const degraded = { ...ok, status: "degraded", services: { ...ok.services, s3: { status: "error" } } };
    expect(() => assertHealth(degraded, "abc1234")).not.toThrow();
  });
});
