import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("trpc-ui", () => ({
  renderTrpcPanel: vi.fn(() => "<html>panel</html>"),
}));

vi.mock("@ironpulse/api", () => ({
  appRouter: {},
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("GET /dev/api-panel", () => {
  it("returns rendered HTML outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { GET } = await import("../route");
    const res = GET();
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain("<html>panel</html>");
  });

  it("404s in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { GET } = await import("../route");
    expect(() => GET()).toThrow("NEXT_NOT_FOUND");
  });
});
