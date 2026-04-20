import { describe, it, expect, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "android", select: (m: any) => m.android ?? m.default },
}));

import { colors, radii, spacing, fonts, tokens, typography } from "../theme";

// These values mirror designs/design_handoff_new/reference/mobile.css. If the
// handoff changes, both files must move together.
describe("v2 theme tokens — acid sport", () => {
  it("uses the v2 ink surfaces, warmer than v1", () => {
    expect(colors.bg).toBe("#0B0D12");
    expect(colors.bg1).toBe("#13161E");
    expect(colors.bg2).toBe("#1B1F29");
    expect(colors.bg3).toBe("#252A38");
    expect(colors.bg4).toBe("#323848");
  });

  it("uses warm off-white text (never pure white)", () => {
    expect(colors.text).toBe("#F4F0E6");
    expect(colors.text2).toBe("#D4D1C6");
    expect(colors.text3).toBe("#A6A49C");
    expect(colors.text4).toBe("#8F8D86");
    // Pure white is still available as an escape hatch but NEVER used as body text.
    expect(colors.white).toBe("#FFFFFF");
  });

  it("primary is electric lime, with a dedicated on-lime ink colour", () => {
    expect(colors.blue).toBe("#D4FF3A");
    expect(colors.blue2).toBe("#C4EF2A");
    // Critical: any text on a lime surface MUST use blueInk, not white.
    expect(colors.blueInk).toBe("#0F1508");
  });

  it("secondary (green slot) is cobalt blue in v2", () => {
    expect(colors.green).toBe("#3A6DFF");
  });

  it("keeps amber/red/orange and adds cyan", () => {
    expect(colors.amber).toBe("#FFB800");
    expect(colors.red).toBe("#FF3D5A");
    expect(colors.orange).toBe("#FF7A3C");
    expect(colors.cyan).toBe("#4FD1E8");
  });

  it("radii expose Material 3 squircle FAB (14-16), pill chip, circle avatar", () => {
    expect(radii.fab).toBeGreaterThanOrEqual(14);
    expect(radii.fab).toBeLessThanOrEqual(16);
    expect(radii.chip).toBe(999);
    expect(radii.avatar).toBeGreaterThanOrEqual(999);
  });

  it("spacing keeps the 16px screen gutter", () => {
    expect(spacing.gutter).toBe(16);
  });

  it("spacing padding tokens sized for modern density (iOS HIG + Material 3)", () => {
    // Card padding aligns with Material 3 card spec.
    expect(spacing.cardPaddingY).toBe(16);
    expect(spacing.cardPaddingX).toBe(18);
    // Rows: min 48dp tap target + breathing room.
    expect(spacing.rowPaddingY).toBeGreaterThanOrEqual(14);
    expect(spacing.touchTarget).toBe(48);
  });

  it("typography scale has hero > display > title > body > caption", () => {
    expect(typography.hero.size).toBeGreaterThan(typography.display.size);
    expect(typography.display.size).toBeGreaterThan(typography.title.size);
    expect(typography.title.size).toBeGreaterThan(typography.body.size);
    expect(typography.body.size).toBeGreaterThanOrEqual(16);
    expect(typography.body.size).toBeGreaterThan(typography.bodySmall.size);
    expect(typography.caption.size).toBeGreaterThanOrEqual(12);
  });

  it("fonts: Instrument Sans replaces Inter for body in v2", () => {
    expect(fonts.bodyRegular).toBe("InstrumentSans-Regular");
    expect(fonts.bodyMedium).toBe("InstrumentSans-Medium");
    expect(fonts.bodySemi).toBe("InstrumentSans-SemiBold");
    // Display + mono are unchanged
    expect(fonts.displaySemi).toBe("SpaceGrotesk-SemiBold");
    expect(fonts.monoMedium).toBe("JetBrainsMono-Medium");
  });

  it("tokens convenience export groups everything", () => {
    expect(tokens.colors).toBe(colors);
    expect(tokens.radii).toBe(radii);
    expect(tokens.spacing).toBe(spacing);
    expect(tokens.fonts).toBe(fonts);
    expect(tokens.typography).toBe(typography);
  });
});
