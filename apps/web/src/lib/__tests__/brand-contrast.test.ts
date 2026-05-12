import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// WCAG 2.1 relative luminance + contrast formulas
// https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  const [r1, g1, b1]: [number, number, number] =
    hp < 1 ? [c, x, 0]
    : hp < 2 ? [x, c, 0]
    : hp < 3 ? [0, c, x]
    : hp < 4 ? [0, x, c]
    : hp < 5 ? [x, 0, c]
    : [c, 0, x];
  const m = lN - c / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

function readPrimaryHsl(): [number, number, number] {
  const css = readFileSync(
    resolve(__dirname, "../../../src/styles/globals.css"),
    "utf-8",
  );
  // Match the FIRST :root { ... } block's --primary line.
  const lightBlock = css.match(/:root\s*{[^}]*}/);
  if (!lightBlock) throw new Error("Could not find :root block in globals.css");
  const match = lightBlock[0].match(/--primary:\s*(\d+)\s+(\d+)%\s+(\d+)%/);
  if (!match) throw new Error("Could not find --primary in :root block");
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

describe("brand primary colour contrast (closes #347)", () => {
  const WHITE: [number, number, number] = [255, 255, 255];
  // --background in light mode = 0 0% 100% but the "muted-bg" surface that
  // flagged in the original audit was #f6f7f8.
  const MUTED_BG: [number, number, number] = [0xf6, 0xf7, 0xf8];

  it("--primary parses cleanly from globals.css", () => {
    const [h, s, l] = readPrimaryHsl();
    expect(h).toBeGreaterThan(0);
    expect(s).toBeGreaterThan(0);
    expect(l).toBeGreaterThan(0);
    expect(l).toBeLessThan(100);
  });

  it("primary text on muted background (#f6f7f8) meets WCAG AA (>= 4.5:1)", () => {
    const [h, s, l] = readPrimaryHsl();
    const rgb = hslToRgb(h, s, l);
    const ratio = contrastRatio(rgb, MUTED_BG);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("white text on primary background meets WCAG AA (>= 4.5:1)", () => {
    const [h, s, l] = readPrimaryHsl();
    const rgb = hslToRgb(h, s, l);
    const ratio = contrastRatio(WHITE, rgb);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
