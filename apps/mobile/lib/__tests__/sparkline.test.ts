import { describe, it, expect, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "android", select: (m: any) => m.android ?? m.default },
}));
vi.mock("react-native-svg", () => ({
  default: () => null,
  Defs: () => null,
  LinearGradient: () => null,
  Path: () => null,
  Stop: () => null,
}));

import { sparkPath } from "../../components/ui/sparkline";

describe("sparkPath", () => {
  it("returns empty paths for empty data", () => {
    expect(sparkPath([], 120, 32)).toEqual({ line: "", area: "" });
  });

  it("renders a flat midline when given a single datapoint", () => {
    const { line, area } = sparkPath([100], 120, 32);
    expect(line).toMatch(/^M1 16/); // midY = height/2
    expect(area).toMatch(/Z$/);
  });

  it("plots a line through all points, first to last", () => {
    const { line } = sparkPath([0, 50, 100], 120, 32);
    expect(line.startsWith("M")).toBe(true);
    // 3 points → 1 M + 2 L commands
    expect((line.match(/M/g) ?? []).length).toBe(1);
    expect((line.match(/L/g) ?? []).length).toBe(2);
  });

  it("closes the area path back to baseline", () => {
    const { area } = sparkPath([1, 2, 3], 120, 32);
    expect(area).toMatch(/L 1 32 Z$/); // closes back to first-x at bottom
  });

  it("handles flat data without dividing by zero", () => {
    const { line } = sparkPath([5, 5, 5], 100, 20);
    expect(line).toMatch(/^M/);
    // All y values should be the same when range is zero
    const ys = [...line.matchAll(/[ML]\s*[\d.]+\s+([\d.]+)/g)].map((m) => parseFloat(m[1]));
    expect(new Set(ys.map((y) => y.toFixed(2))).size).toBe(1);
  });
});
