import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";

const REQUIRED_SOURCES = [
  "assets/branding/svg/zor-mark.svg",
  "assets/branding/svg/zor-mark-small.svg",
  "assets/branding/svg/zor-lockup-horizontal.svg",
  "assets/branding/svg/zor-lockup-stacked.svg",
];

for (const source of REQUIRED_SOURCES) {
  assert.ok(existsSync(source), "Missing canonical source: " + source);
}

for (const source of REQUIRED_SOURCES) {
  const svg = readFileSync(source, "utf8");
  assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/u, source + " must declare the SVG namespace");
  assert.doesNotMatch(svg, /<(?:text|image|filter|linearGradient|radialGradient)\b/iu, source + " contains a prohibited element");
  assert.doesNotMatch(svg, /#[0-9A-Fa-f]{3,8}|url\(/u, source + " must use currentColor");
  assert.match(svg, /fill="currentColor"/u, source + " must use currentColor");
}

for (const source of REQUIRED_SOURCES.slice(0, 2)) {
  assert.match(readFileSync(source, "utf8"), /viewBox="0 0 64 64"/u, source + " must use the 64-unit grid");
}
const displayMark = readFileSync(REQUIRED_SOURCES[0], "utf8");
assert.equal(
  (displayMark.match(/<path\b/gu) ?? []).length,
  1,
  "display mark must be one path containing the reference's two interlocking components",
);
const displayPath = displayMark.match(/d="([^"]+)"/u)?.[1] ?? "";
assert.equal(
  (displayPath.match(/M/gu) ?? []).length,
  2,
  "display mark must contain exactly two closed reference components",
);
assert.equal(
  (displayPath.match(/Q/gu) ?? []).length,
  2,
  "display mark must smooth only the reference's top-left and bottom-right terminals",
);
assert.match(
  displayPath,
  /M10\.8 55\.65L54\.98 12\.36L25\.98 45\.83/u,
  "upper-right point must be the sharp 180-degree counterpart of the lower-left point",
);
assert.equal(
  readFileSync(REQUIRED_SOURCES[0], "utf8").match(/d="([^"]+)"/u)?.[1],
  readFileSync(REQUIRED_SOURCES[1], "utf8").match(/d="([^"]+)"/u)?.[1],
  "small mark must preserve the traced reference geometry",
);

const EXPECTED = {
  "apps/mobile/assets/icon.png": [1024, 1024, false],
  "apps/mobile/assets/logo-mark.png": [1024, 1024, true],
  "apps/mobile/assets/splash-icon.png": [1024, 1024, true],
  "apps/mobile/assets/favicon.png": [48, 48, false],
  "apps/mobile/assets/android-icon-foreground.png": [432, 432, true],
  "apps/mobile/assets/android-icon-background.png": [108, 108, false],
  "apps/mobile/assets/android-icon-monochrome.png": [432, 432, true],
  "apps/web/public/icons/icon.svg": [64, 64, true],
  "apps/web/public/icons/icon-192.png": [192, 192, false],
  "apps/web/public/icons/icon-512.png": [512, 512, false],
  "apps/web/public/icons/icon-512-maskable.png": [512, 512, false],
  "apps/web/src/app/icon.png": [512, 512, false],
  "apps/web/src/app/apple-icon.png": [180, 180, false],
  "apps/web/public/favicon.ico": [[16, 32, 48], undefined, false],
  "assets/branding/zor-social-card.png": [1200, 630, false],
  "assets/branding/generated/zor-svg-preview.png": [1600, 1000, false],
  "assets/branding/generated/zor-mark-16.png": [16, 16, true],
  "assets/branding/generated/zor-mark-24.png": [24, 24, true],
};
const manifest = JSON.parse(readFileSync("assets/branding/zor-assets-manifest.json", "utf8"));
assert.equal(manifest.generator, "zor-assets-v1");

for (const [path, [width, height, transparent]] of Object.entries(EXPECTED)) {
  assert.ok(existsSync(path), "Missing generated asset: " + path);
  const entry = manifest.outputs[path];
  assert.ok(entry, "Missing manifest entry: " + path);
  assert.equal(entry.transparent, transparent, "Transparency policy mismatch: " + path);
  const data = readFileSync(path);
  assert.equal(entry.sha256, createHash("sha256").update(data).digest("hex"), "Hash mismatch: " + path);
  if (path.endsWith(".svg")) {
    assert.match(data.toString("utf8"), /fill="#0B0D12"/u);
    continue;
  }
  if (path.endsWith(".ico")) {
    assert.deepEqual(entry.size, width);
    assert.equal(data.readUInt16LE(0), 0, "ICO reserved header must be zero");
    assert.equal(data.readUInt16LE(2), 1, "ICO type must be icon");
    continue;
  }
  const metadata = await sharp(data).metadata();
  assert.deepEqual([metadata.width, metadata.height], [width, height], "Dimension mismatch: " + path);
  assert.equal(Boolean(metadata.hasAlpha), transparent, "Alpha mismatch: " + path);
}

const foreground = await sharp("apps/mobile/assets/android-icon-foreground.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let minX = foreground.info.width, minY = foreground.info.height, maxX = -1, maxY = -1;
for (let y = 0; y < foreground.info.height; y += 1) {
  for (let x = 0; x < foreground.info.width; x += 1) {
    if (foreground.data[(y * foreground.info.width + x) * foreground.info.channels + 3] > 0) {
      minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
  }
}
for (const edge of [minX, minY, foreground.info.width - 1 - maxX, foreground.info.height - 1 - maxY]) {
  assert.ok(edge >= foreground.info.width * 0.17, "Android foreground exceeds the 66% safe zone");
}

console.log("Zor branding assets verified.");
