# Zor SVG Identity System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build editable Zor SVG sources and deterministically derive native, web, Android adaptive, PWA, and social identity assets from them.

**Architecture:** The four canonical SVGs are the only editable source. A Node ESM generator resolves `currentColor`, rasterizes at target density with root-level `sharp`, writes platform assets, and emits a sorted manifest. A Node assertion checker validates vector policy and raster output; cross-machine reproducibility uses source/config hashes rather than PNG byte equality.

**Tech Stack:** SVG 1.1, Node.js ESM, exact `sharp@0.34.5`, Node `assert`, pnpm.

## Global Constraints

- Work only on `design/zor-logo-system`; do not touch the dirty `rename/mettle-lift` checkout.
- Preserve the approved sharp, forward-leaning Z and dual diagonal cut.
- Use lime `#D4FF3A`, ink `#0B0D12`, and bone `#F4F0E6` only.
- Canonical marks are transparent, use `currentColor`, declare `xmlns="http://www.w3.org/2000/svg"`, and use `viewBox="0 0 64 64"`.
- Canonical SVGs contain no text, fonts, embedded raster images, filters, gradients, shadows, or baked backgrounds.
- Android adaptive foreground and maskable marks fit the central 66% safe zone; OS masks provide corner rounding.
- In the pinned Node/sharp environment, generation must be byte-repeatable. Across platforms, CI validates source/config hashes rather than PNG byte equality because libvips can vary by architecture.
- Do not change app copy, deep links, configuration, packages, or deployment identifiers before the user has approved rendered SVGs.

---

## File Structure

- `assets/branding/svg/zor-mark.svg` — 64-unit transparent display mark.
- `assets/branding/svg/zor-mark-small.svg` — strengthened sub-24 px mark.
- `assets/branding/svg/zor-lockup-horizontal.svg` — mark and outlined lowercase wordmark.
- `assets/branding/svg/zor-lockup-stacked.svg` — stacked mark and outlined lowercase wordmark.
- `scripts/generate-zor-assets.mjs` — source reader, color resolver, raster writer, safe-zone compositor, manifest writer.
- `scripts/verify-zor-assets.mjs` — source and output assertions.
- `assets/branding/zor-assets-manifest.json` — sorted output metadata and hashes.
- Existing files in `apps/mobile/assets/`, `apps/web/public/icons/`, and `apps/web/src/app/` — generator outputs, never hand edited.
- `package.json` — exact direct `sharp` and `png-to-ico` devDependencies plus `branding:generate` and `branding:check` scripts.

## Task 0: Make the generator dependency reproducible

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: root-level, exact `sharp@0.34.5` and `png-to-ico@3.0.1` devDependencies that scripts may import after a fresh pnpm install.

- [ ] **Step 1: Verify the direct-dependency gap**

Run: `rg -n '"(sharp|png-to-ico)"' package.json apps/*/package.json`

Expected: no direct package declaration is found.

- [ ] **Step 2: Add and lock the dependency**

Run: `pnpm add -Dw sharp@0.34.5 png-to-ico@3.0.1 && pnpm install --frozen-lockfile`

Expected: root `devDependencies.sharp` is exactly `0.34.5` and `devDependencies.png-to-ico` is exactly `3.0.1`; the fresh-install validation exits 0.

- [ ] **Step 3: Verify worktree resolution**

Run: `node -e "console.log(require.resolve('sharp')); console.log(require.resolve('png-to-ico'))"`

Expected: a path beneath this worktree's `node_modules`.

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "build(branding): add sharp generator dependency"
```

## Task 1: Establish the failing asset contract

**Files:**
- Create: `scripts/verify-zor-assets.mjs`
- Modify: `package.json`
- Test: `scripts/verify-zor-assets.mjs`

**Interfaces:**
- Consumes: the four future canonical SVGs and the future manifest.
- Produces: `pnpm branding:check`, which exits 0 only for valid sources and generated outputs.

- [ ] **Step 1: Write failing source assertions**

```js
const REQUIRED_SOURCES = [
  'assets/branding/svg/zor-mark.svg',
  'assets/branding/svg/zor-mark-small.svg',
  'assets/branding/svg/zor-lockup-horizontal.svg',
  'assets/branding/svg/zor-lockup-stacked.svg',
];
for (const source of REQUIRED_SOURCES) {
  assert.ok(existsSync(source), 'Missing canonical source: ' + source);
}
```

Also define exact output entries for mobile `icon.png` (1024), `favicon.png` (48), all Android adaptive files (432/108), PWA 192/512 icons, web `favicon.ico` (16/32/48), Apple icon (180), and `assets/branding/zor-social-card.png` (1200×630).

- [ ] **Step 2: Verify the contract fails**

Run: `pnpm branding:check`

Expected: exit 1 with `Missing canonical source: assets/branding/svg/zor-mark.svg`.

- [ ] **Step 3: Wire the scripts**

```json
{
  "scripts": {
    "branding:generate": "node scripts/generate-zor-assets.mjs",
    "branding:check": "node scripts/verify-zor-assets.mjs"
  }
}
```

The checker reads SVG strings; uses `sharp(...).metadata()` for PNG dimensions/alpha; and hashes buffers with `crypto.createHash('sha256')`.

- [ ] **Step 4: Re-run the failure check**

Run: `pnpm branding:check`

Expected: the same explicit missing-source failure.

- [ ] **Step 5: Commit**

```bash
git add package.json scripts/verify-zor-assets.mjs
git commit -m "test(branding): define Zor asset contract"
```

## Task 2: Create the canonical SVGs

**Files:**
- Create: `assets/branding/svg/zor-mark.svg`
- Create: `assets/branding/svg/zor-mark-small.svg`
- Create: `assets/branding/svg/zor-lockup-horizontal.svg`
- Create: `assets/branding/svg/zor-lockup-stacked.svg`
- Create: `assets/branding/svg/README.md`
- Modify: `scripts/verify-zor-assets.mjs`

**Interfaces:**
- Consumes: Task 1 source-policy contract.
- Produces: transparent, currentColor SVG paths for the four stable consumer names.

- [ ] **Step 1: Add failing vector-policy assertions**

```js
assert.match(svg, /viewBox="0 0 64 64"/);
assert.doesNotMatch(svg, /<(?:text|image|filter|linearGradient|radialGradient)\b/i);
assert.match(svg, /fill="currentColor"/);
assert.doesNotMatch(svg, /#[0-9A-Fa-f]{3,8}|url\(/);
```

For lockups, assert a root viewBox, the SVG namespace, and no text/image/effect element. Require a different path signature for `zor-mark-small.svg`. Geometric primitives remain permitted, although the committed mark and wordmark will use paths.

- [ ] **Step 2: Verify it fails**

Run: `pnpm branding:check`

Expected: exit 1 at the first missing SVG.

- [ ] **Step 3: Draw display and small marks as compound paths**

Use one `<path fill="currentColor" fill-rule="evenodd">` per mark. On the 64 grid, use top/bottom rails at y=11–20 and y=44–53, a forward diagonal between them, and a parallel negative cut. The display mark has a 3-unit cut; the small mark has a 4-unit cut and no terminal detail below two units. Coordinates must be hand-authored, not traced or embedded from a PNG.

- [ ] **Step 4: Export licensed outlined lockups**

Before export, record the selected font's redistribution/outlining permission in a short `assets/branding/svg/README.md`. Use the established Clash Display or Space Grotesk source only when its license permits committed outlines; export lowercase `z`, `o`, and `r` to path data once, then compose each lockup from the display mark and those outlines. Keep every visible path `fill="currentColor"`; include no `<text>`, runtime font, or background.

- [ ] **Step 5: Run source-policy verification**

Run: `pnpm branding:check`

Expected: source policy passes; command exits 1 only because generated assets and manifest are absent.

- [ ] **Step 6: Commit**

```bash
git add assets/branding/svg scripts/verify-zor-assets.mjs
git commit -m "feat(branding): add canonical Zor SVG sources"
```

## Task 3: Generate platform assets deterministically

**Files:**
- Create: `scripts/generate-zor-assets.mjs`
- Create: `assets/branding/zor-assets-manifest.json`
- Modify: `apps/mobile/assets/icon.png`
- Modify: `apps/mobile/assets/logo-mark.png`
- Modify: `apps/mobile/assets/splash-icon.png`
- Modify: `apps/mobile/assets/favicon.png`
- Modify: `apps/mobile/assets/android-icon-foreground.png`
- Modify: `apps/mobile/assets/android-icon-background.png`
- Modify: `apps/mobile/assets/android-icon-monochrome.png`
- Modify: `apps/web/public/icons/icon.svg`
- Modify: `apps/web/public/icons/icon-192.png`
- Modify: `apps/web/public/icons/icon-512.png`
- Modify: `apps/web/public/icons/icon-512-maskable.png`
- Modify: `apps/web/public/favicon.ico`
- Modify: `apps/web/src/app/icon.png`
- Modify: `apps/web/src/app/apple-icon.png`
- Create: `assets/branding/zor-social-card.png`
- Modify: `scripts/verify-zor-assets.mjs`

**Interfaces:**
- Consumes: Task 2 sources and `COLORS = { lime: '#D4FF3A', ink: '#0B0D12', bone: '#F4F0E6' }`.
- Produces: `await generateAllAssets()`, platform assets, and an ordered manifest.

- [ ] **Step 1: Add failing output assertions**

```js
assert.deepEqual(manifest.outputs['apps/mobile/assets/icon.png'].size, [1024, 1024]);
assert.equal(manifest.outputs['apps/mobile/assets/android-icon-foreground.png'].transparent, true);
assert.equal(manifest.outputs['apps/web/public/icons/icon-512-maskable.png'].size[0], 512);
assert.equal(manifest.outputs['assets/branding/zor-social-card.png'].size.join('x'), '1200x630');
```

Require the following target policy in the manifest and checker:

| Output | Background | Mark/lockup paint |
| --- | --- | --- |
| `apps/mobile/assets/icon.png` | opaque lime | ink |
| `apps/mobile/assets/logo-mark.png` | transparent | lime |
| `apps/mobile/assets/splash-icon.png` | transparent | lime |
| `apps/mobile/assets/favicon.png` | opaque lime | ink |
| Android foreground | transparent | ink |
| Android background | opaque lime | no mark |
| Android monochrome | transparent alpha mask | OS-tinted source |
| PWA, Next, Apple and `.ico` icons | opaque lime | ink |
| `apps/web/public/icons/icon.svg` | transparent | resolved ink |
| `assets/branding/zor-social-card.png` | opaque ink | lime and bone lockups |

Inspect nontransparent bounds for 432 px foreground and 512 px maskable output; each edge must fall within 17%–83% of the canvas. Require opaque lime Android background, alpha-only monochrome output, and transparent corners for transparent marks.

- [ ] **Step 2: Verify it fails**

Run: `pnpm branding:check`

Expected: exit 1 naming the missing manifest or generated icon.

- [ ] **Step 3: Implement source resolution and PNG writer**

```js
const sourceFor = (name, color) => readFileSync(join(SVG_DIR, name), 'utf8')
  .replaceAll('currentColor', color);
const hash = (buffer) => createHash('sha256').update(buffer).digest('hex');
async function writePng({ svg, width, height, background, output }) {
  const density = Math.ceil(72 * Math.max(width, height) / 64);
  let image = sharp(Buffer.from(svg), { density }).resize(width, height, { fit: 'contain' });
  if (background) image = image.flatten({ background });
  const data = await image.png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  writeFileSync(output, data);
  return data;
}
```

Use a sorted target specification object and the target-policy table above. Adaptive/maskable marks are centered at 66% of canvas extent; Android background is opaque lime; monochrome preserves only the mark alpha. For standalone `apps/web/public/icons/icon.svg`, write a copy of the canonical SVG with `currentColor` resolved to ink and the SVG namespace retained; do not treat it as a raster output. Generate `apps/web/public/favicon.ico` from 16, 32, and 48 px PNG representations using an explicitly declared root dependency such as `png-to-ico`; if that package is added, pin it exactly and include it in the frozen-install verification. Write two-space sorted JSON with path, dimensions, alpha intent, palette role, SHA-256, and a source/config hash.

- [ ] **Step 4: Generate twice and compare**

Run: `pnpm branding:generate && cp assets/branding/zor-assets-manifest.json /tmp/zor-assets-manifest.first.json && pnpm branding:generate && cmp /tmp/zor-assets-manifest.first.json assets/branding/zor-assets-manifest.json`

Expected: both generations and `cmp` exit 0 in this pinned environment. The checker separately verifies the source/config hash for portable CI; it does not promise PNG byte equality across different libvips architectures.

- [ ] **Step 5: Validate generated assets**

Run: `pnpm branding:check`

Expected: exit 0 after palette, source, dimensions, alpha, safe-zone, and hash checks.

- [ ] **Step 6: Commit**

```bash
git add scripts assets/branding/zor-assets-manifest.json assets/branding/zor-social-card.png apps/mobile/assets apps/web/public/icons apps/web/public/favicon.ico apps/web/src/app/icon.png apps/web/src/app/apple-icon.png package.json pnpm-lock.yaml
git commit -m "feat(branding): generate Zor platform assets"
```

## Task 4: Produce SVG visual proof

**Files:**
- Create: `assets/branding/generated/zor-svg-preview.png`
- Create: `assets/branding/generated/zor-mark-16.png`
- Create: `assets/branding/generated/zor-mark-24.png`
- Modify: `scripts/generate-zor-assets.mjs`
- Modify: `scripts/verify-zor-assets.mjs`

**Interfaces:**
- Consumes: Task 3 sources and generator.
- Produces: source-rendered review sheet and exact small-size proofs.

- [ ] **Step 1: Add failing preview assertions**

```js
for (const preview of [
  'assets/branding/generated/zor-svg-preview.png',
  'assets/branding/generated/zor-mark-16.png',
  'assets/branding/generated/zor-mark-24.png',
]) assert.ok(existsSync(preview), 'Missing SVG proof: ' + preview);
assert.deepEqual(await dimensions('assets/branding/generated/zor-mark-16.png'), [16, 16]);
assert.deepEqual(await dimensions('assets/branding/generated/zor-mark-24.png'), [24, 24]);
```

Require transparent corners and at least one transparent pixel in the central diagonal cut for both small proof images.

- [ ] **Step 2: Verify it fails**

Run: `pnpm branding:check`

Expected: exit 1 with missing `zor-svg-preview.png`.

- [ ] **Step 3: Extend the generator**

Render the small SVG in lime at exactly 16 px and 24 px on transparent canvases using `sharp(Buffer.from(svg), { density: Math.ceil(72 * targetPx / 64) })` before its final resize. Generate a 1600×1000 ink review sheet containing lime display mark, bone small mark, both lockups, and labels, all rasterized from canonical SVGs at the same target-density rule. It is evidence only, not a runtime asset.

- [ ] **Step 4: Regenerate and validate**

Run: `pnpm branding:generate && pnpm branding:check`

Expected: both exit 0; preview is 1600×1000 and small images retain a central cut.

- [ ] **Step 5: Commit**

```bash
git add scripts/verify-zor-assets.mjs scripts/generate-zor-assets.mjs assets/branding/generated assets/branding/zor-assets-manifest.json
git commit -m "test(branding): add Zor SVG visual proof"
```

## Task 5: Stop for user SVG approval

**Files:**
- Modify: `docs/superpowers/specs/2026-08-08-zor-complete-rebrand-design.md`
- Modify: Backlog task metadata through CLI only

**Interfaces:**
- Consumes: Tasks 1–4 passing evidence.
- Produces: explicit approval or a source-geometry change request.

- [ ] **Step 1: Record evidence**

Append an SVG-foundation evidence section to the design spec listing successful `pnpm branding:generate` and `pnpm branding:check` commands plus the preview paths.

- [ ] **Step 2: Record the review gate in Backlog**

Run: `backlog task edit TASK-21.1 --append-notes "Canonical SVGs and derived assets generated; branding checks pass. Awaiting visual approval."`

Expected: child task history updates; dependent task status does not change.

- [ ] **Step 3: Attach SVG proof as review evidence**

Record `assets/branding/generated/zor-svg-preview.png`, `zor-mark-16.png`, and `zor-mark-24.png` in the evidence note/PR and attach those paths in the user review. State that no product copy, configuration, package, or operational identifier has changed.

- [ ] **Step 4: Wait for an explicit user decision**

If geometry changes are requested, edit only canonical SVG path data, regenerate, re-run `pnpm branding:check`, and show a revised preview. If approved, commit the evidence-doc update with:

```bash
git add docs/superpowers/specs/2026-08-08-zor-complete-rebrand-design.md
git commit -m "docs(branding): record Zor SVG approval"
```

## Plan Self-Review

- Coverage: Tasks 1–4 implement all TASK-21.1 requirements—canonical SVGs, palette, deterministic native/web generator, Android safe zones, transparency, reproducibility, and small-size evidence.
- Scope: product copy, deep links, package migration, and legacy-name audit remain intentionally deferred to TASK-21.2 and TASK-21.3.
- Consistency: all tasks use the same four source paths, three tokens, generator/check commands, manifest, and preview names.
