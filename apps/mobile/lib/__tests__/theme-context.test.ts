import { describe, it, expect, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "android", select: (m: any) => m.android ?? m.default },
  useColorScheme: () => "dark",
}));
vi.mock("@/lib/secure-store", () => ({
  getItemAsync: vi.fn().mockResolvedValue(null),
  setItemAsync: vi.fn().mockResolvedValue(undefined),
  deleteItemAsync: vi.fn().mockResolvedValue(undefined),
}));

import { __internal } from "../theme-context";
import { darkColors, lightColors } from "../theme";

describe("theme-context.resolveMode", () => {
  it("returns system theme when mode is 'system'", () => {
    expect(__internal.resolveMode("system", "dark")).toBe("dark");
    expect(__internal.resolveMode("system", "light")).toBe("light");
  });

  it("returns explicit mode regardless of system preference", () => {
    expect(__internal.resolveMode("dark", "light")).toBe("dark");
    expect(__internal.resolveMode("light", "dark")).toBe("light");
  });
});

describe("light/dark palette parity", () => {
  it("exposes the same keys on both palettes", () => {
    expect(Object.keys(lightColors).sort()).toEqual(
      Object.keys(darkColors).sort(),
    );
  });

  it("flips bg + text between palettes", () => {
    expect(darkColors.bg).not.toBe(lightColors.bg);
    expect(darkColors.text).not.toBe(lightColors.text);
    // text on dark bg must be bright; text on light bg must be dark
    expect(lightColors.bg.toUpperCase()).toBe("#F9F4E1");
    expect(lightColors.text.toUpperCase()).toBe("#0F1508");
  });

  it("keeps lime as the primary brand colour in both modes (with different saturations)", () => {
    expect(darkColors.blue.startsWith("#D4")).toBe(true);
    expect(lightColors.blue.startsWith("#C4")).toBe(true);
    // blueInk (on-lime ink) is shared across modes — same ink reads on lime anywhere
    expect(darkColors.blueInk).toBe(lightColors.blueInk);
  });
});
