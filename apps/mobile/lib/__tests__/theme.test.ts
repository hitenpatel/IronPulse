import { describe, it, expect, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "android", select: (m: any) => m.android ?? m.default },
}));

import { colors, radii, spacing, fonts, tokens } from "../theme";

// These values mirror designs/claude-design-handoff/mobile.css. If the
// handoff changes, both files must move together.
describe("theme tokens", () => {
  it("surface colors match the handoff palette", () => {
    expect(colors.bg).toBe("#060B14");
    expect(colors.bg1).toBe("#0B121D");
    expect(colors.bg2).toBe("#111A28");
    expect(colors.bg3).toBe("#172434");
    expect(colors.bg4).toBe("#1E2D41");
  });

  it("text scale matches the handoff palette", () => {
    expect(colors.text).toBe("#E7ECF3");
    expect(colors.text2).toBe("#AEBAC9");
    expect(colors.text3).toBe("#7A8698");
    expect(colors.text4).toBe("#4F5A6D");
  });

  it("brand + semantic accents match the handoff palette", () => {
    expect(colors.blue).toBe("#0077FF");
    expect(colors.blue2).toBe("#3391FF");
    expect(colors.green).toBe("#22C55E");
    expect(colors.purple).toBe("#8B5CF6");
    expect(colors.amber).toBe("#F59E0B");
    expect(colors.red).toBe("#EF4444");
    expect(colors.orange).toBe("#F97316");
  });

  it("radii expose Material 3 squircle FAB (14-16), pill chip, circle avatar", () => {
    expect(radii.fab).toBeGreaterThanOrEqual(14);
    expect(radii.fab).toBeLessThanOrEqual(16);
    expect(radii.chip).toBe(999);
    expect(radii.avatar).toBeGreaterThanOrEqual(999);
  });

  it("spacing uses the 16px screen gutter from the handoff", () => {
    expect(spacing.gutter).toBe(16);
  });

  it("font families are defined (system fallback OR bundled family)", () => {
    expect(fonts.display).toBeTruthy();
    expect(fonts.body).toBeTruthy();
    expect(fonts.mono).toBeTruthy();
  });

  it("tokens convenience export groups everything", () => {
    expect(tokens.colors).toBe(colors);
    expect(tokens.radii).toBe(radii);
    expect(tokens.spacing).toBe(spacing);
    expect(tokens.fonts).toBe(fonts);
  });
});
