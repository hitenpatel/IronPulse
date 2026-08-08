import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import pngToIco from "png-to-ico";
import sharp from "sharp";

const ROOT = process.cwd();
const SVG_DIR = join(ROOT, "assets/branding/svg");
const MANIFEST_PATH = join(ROOT, "assets/branding/zor-assets-manifest.json");
const COLORS = { lime: "#D4FF3A", ink: "#0B0D12", bone: "#F4F0E6" };
const sourceHash = createHash("sha256")
  .update([
    "generator-v1",
    ...Object.entries(COLORS).flat(),
    ...["zor-mark.svg", "zor-mark-small.svg", "zor-lockup-horizontal.svg", "zor-lockup-stacked.svg"]
      .map((name) => readFileSync(join(SVG_DIR, name))),
  ].join("|"))
  .digest("hex");
const outputs = {};

function sourceFor(name, color) {
  return readFileSync(join(SVG_DIR, name), "utf8").replaceAll("currentColor", color);
}

function innerSvg(svg) {
  return svg.replace(/^<svg[^>]*>\s*/u, "").replace(/\s*<\/svg>\s*$/u, "");
}

function squareSvg(name, color, size, { background, scale = 1 } = {}) {
  const markSize = size * scale;
  const offset = (size - markSize) / 2;
  const backgroundRect = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${backgroundRect}<g transform="translate(${offset} ${offset}) scale(${(markSize / 64)})">${innerSvg(sourceFor(name, color))}</g></svg>`;
}

function densityFor(svg, width, height) {
  const match = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/u);
  const viewWidth = Number(match?.[1] ?? 64);
  const viewHeight = Number(match?.[2] ?? 64);
  return Math.ceil(72 * Math.max(width / viewWidth, height / viewHeight));
}

async function render(svg, width, height) {
  return sharp(Buffer.from(svg), { density: densityFor(svg, width, height) })
    .resize(width, height, { fit: "contain", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toBuffer();
}

async function writePng(relativePath, svg, width, height, { transparent, paletteRole }) {
  let buffer = await render(svg, width, height);
  if (!transparent) {
    buffer = await sharp(buffer).flatten({ background: COLORS.lime }).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  }
  const target = join(ROOT, relativePath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, buffer);
  outputs[relativePath] = {
    size: [width, height],
    transparent,
    paletteRole,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
  return buffer;
}

function previewSvg() {
  const display = innerSvg(sourceFor("zor-mark.svg", COLORS.lime));
  const small = innerSvg(sourceFor("zor-mark-small.svg", COLORS.bone));
  const horizontal = innerSvg(sourceFor("zor-lockup-horizontal.svg", COLORS.lime));
  const stacked = innerSvg(sourceFor("zor-lockup-stacked.svg", COLORS.bone));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><rect width="1600" height="1000" fill="${COLORS.ink}"/><g transform="translate(130 110) scale(7)">${display}</g><g transform="translate(940 120) scale(7)">${small}</g><g transform="translate(140 680) scale(4)">${horizontal}</g><g transform="translate(1040 560) scale(4)">${stacked}</g></svg>`;
}

async function generate() {
  const displayLime = (size, options) => squareSvg("zor-mark.svg", COLORS.lime, size, options);
  const displayInk = (size, options) => squareSvg("zor-mark.svg", COLORS.ink, size, options);
  const smallLime = (size, options) => squareSvg("zor-mark-small.svg", COLORS.lime, size, options);

  await writePng("apps/mobile/assets/icon.png", displayInk(1024, { background: COLORS.lime }), 1024, 1024, { transparent: false, paletteRole: "lime-tile-ink-mark" });
  await writePng("apps/mobile/assets/logo-mark.png", displayLime(1024), 1024, 1024, { transparent: true, paletteRole: "lime-transparent" });
  await writePng("apps/mobile/assets/splash-icon.png", displayLime(1024, { scale: 0.66 }), 1024, 1024, { transparent: true, paletteRole: "lime-transparent" });
  await writePng("apps/mobile/assets/favicon.png", displayInk(48, { background: COLORS.lime }), 48, 48, { transparent: false, paletteRole: "lime-tile-ink-mark" });
  await writePng("apps/mobile/assets/android-icon-foreground.png", displayInk(432, { scale: 0.66 }), 432, 432, { transparent: true, paletteRole: "ink-transparent-safe-zone" });
  await writePng("apps/mobile/assets/android-icon-background.png", `<svg xmlns="http://www.w3.org/2000/svg" width="108" height="108"><rect width="108" height="108" fill="${COLORS.lime}"/></svg>`, 108, 108, { transparent: false, paletteRole: "lime-tile" });
  await writePng("apps/mobile/assets/android-icon-monochrome.png", squareSvg("zor-mark.svg", "#FFFFFF", 432, { scale: 0.66 }), 432, 432, { transparent: true, paletteRole: "alpha-mask" });

  writeFileSync(join(ROOT, "apps/web/public/icons/icon.svg"), sourceFor("zor-mark.svg", COLORS.ink));
  outputs["apps/web/public/icons/icon.svg"] = { size: [64, 64], transparent: true, paletteRole: "ink-standalone-svg", sha256: createHash("sha256").update(readFileSync(join(ROOT, "apps/web/public/icons/icon.svg"))).digest("hex") };
  await writePng("apps/web/public/icons/icon-192.png", displayInk(192, { background: COLORS.lime }), 192, 192, { transparent: false, paletteRole: "lime-tile-ink-mark" });
  await writePng("apps/web/public/icons/icon-512.png", displayInk(512, { background: COLORS.lime }), 512, 512, { transparent: false, paletteRole: "lime-tile-ink-mark" });
  await writePng("apps/web/public/icons/icon-512-maskable.png", displayInk(512, { background: COLORS.lime, scale: 0.66 }), 512, 512, { transparent: false, paletteRole: "lime-tile-ink-mark-safe-zone" });
  await writePng("apps/web/src/app/icon.png", displayInk(512, { background: COLORS.lime }), 512, 512, { transparent: false, paletteRole: "lime-tile-ink-mark" });
  await writePng("apps/web/src/app/apple-icon.png", displayInk(180, { background: COLORS.lime }), 180, 180, { transparent: false, paletteRole: "lime-tile-ink-mark" });
  await writePng("assets/branding/zor-social-card.png", previewSvg(), 1200, 630, { transparent: false, paletteRole: "ink-lime-bone" });
  await writePng("assets/branding/generated/zor-svg-preview.png", previewSvg(), 1600, 1000, { transparent: false, paletteRole: "ink-lime-bone" });
  await writePng("assets/branding/generated/zor-mark-16.png", smallLime(16), 16, 16, { transparent: true, paletteRole: "lime-transparent-small" });
  await writePng("assets/branding/generated/zor-mark-24.png", smallLime(24), 24, 24, { transparent: true, paletteRole: "lime-transparent-small" });

  const temp = mkdtempSync(join(tmpdir(), "zor-favicon-"));
  try {
    const pngs = [];
    for (const size of [16, 32, 48]) {
      const path = join(temp, `zor-${size}.png`);
      writeFileSync(path, await render(displayInk(size, { background: COLORS.lime }), size, size));
      pngs.push(path);
    }
    const ico = await pngToIco(pngs);
    const icoPath = join(ROOT, "apps/web/public/favicon.ico");
    writeFileSync(icoPath, ico);
    outputs["apps/web/public/favicon.ico"] = { size: [16, 32, 48], transparent: false, paletteRole: "lime-tile-ink-mark", sha256: createHash("sha256").update(ico).digest("hex") };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }

  writeFileSync(MANIFEST_PATH, JSON.stringify({ generator: "zor-assets-v1", sourceHash, outputs: Object.fromEntries(Object.entries(outputs).sort(([a], [b]) => a.localeCompare(b))) }, null, 2) + "\n");
}

await generate();
console.log("Generated " + Object.keys(outputs).length + " Zor branding assets.");
