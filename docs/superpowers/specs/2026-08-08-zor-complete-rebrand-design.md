# Zor Complete Rebrand Design

**Status:** Approved design; implementation pending spec review  
**Date:** 2026-08-08  
**Branch:** `design/zor-logo-system`

## Purpose

Replace the abandoned Mettle Lift presentation and the public-facing IronPulse identity with **Zor**, a premium fitness and workout-tracking brand. This is a brand migration, not a redesign: preserve the current acid-sport visual language, information architecture, features, navigation, and behavior while replacing identity assets, copy, metadata, and safe developer-facing names.

The in-product name and installed-app label are **Zor**. The store listing title is **Zor Fitness** because exact-name Zor listings already exist. App Store Connect availability remains the final authority before submission.

## Execution Boundary

Work proceeds on the clean `design/zor-logo-system` branch, which already contains the approved PNG reference set. The dirty `rename/mettle-lift` checkout is outside this work and must remain untouched. The current branch contains Mettle Lift rename commits; this migration replaces those transient Mettle Lift names directly with Zor.

The repository remains at its existing Forgejo and GitHub path, `hiten/IronPulse`. No remote, clone URL, data store, hosted service, or deployment location is renamed.

## Identity System

### Brand character and palette

Zor is sharp, fast, premium, and training-focused. Its mark follows the approved JPEG reference: a compact 1.14:1 geometric `Z` made from two interlocking filled components separated by a narrow parallel negative-space slash. The canonical coordinates are traced from the clean standalone mark in that reference, simplified into straight vector segments, and finished with shallow curves only at the top-left and bottom-right outer terminals; they must not be replaced by an invented three-rail construction. It must remain recognizable at launcher-icon and favicon sizes without depending on texture, shadows, gradients, or a font.

Canonical product tokens are:

| Token | Value | Use |
| --- | --- | --- |
| Lime | `#D4FF3A` | Primary Zor accent and positive emphasis |
| Ink | `#0B0D12` | Primary dark surface and dark mark |
| Bone | `#F4F0E6` | Light wordmark and mark variant |

The earlier draft PNG palette (`#D7FF19`, `#090B0F`, white) is reference-only and is not carried into the generated asset system.

### Canonical vector sources

Create transparent, source-controlled SVGs under `assets/branding/svg/`:

- `zor-mark.svg`: canonical display mark using `currentColor`.
- `zor-mark-small.svg`: strengthened dual-cut version for rendering below 24 px.
- `zor-lockup-horizontal.svg`: mark plus outlined lowercase `zor` wordmark.
- `zor-lockup-stacked.svg`: mark above outlined lowercase `zor` wordmark.

All letterforms are path outlines; no `<text>`, external font, raster image, filter, gradient, shadow, or texture is permitted. The mark uses a fixed 64-by-64 viewBox and deliberate geometry, rather than tracing raster pixels. The sources are transparent and accept their color through `currentColor` so product surfaces control theme color.

### Derived asset policy

A deterministic Node asset generator consumes only the canonical SVG sources and color tokens. It emits tracked platform assets to the existing mobile and web asset locations, plus a manifest of dimensions and hashes. Re-running the generator with unchanged sources produces byte-identical outputs.

Generated outputs include:

- Mobile launcher icon, splash icon, favicon, and visible mark assets.
- Android adaptive foreground, background, and monochrome assets. The foreground/maskable mark stays inside the Android 66% safe zone; corner rounding is left to the OS mask.
- Web and PWA `icon.svg`, favicon, Apple icon, 192 px icon, 512 px icon, and 512 px maskable icon.
- Theme-aware transparent lockups for mobile and web surfaces.
- A fixed-size opaque social/OG card that is the sole intentional non-icon opaque brand composition.

Transparent marks never include a baked background. Launcher tiles and the social card may have opaque backgrounds by design. All generated raster assets are high-resolution RGB/RGBA files with expected dimensions, alpha behavior, and safe-zone checks.

## Product Cutover

### Visible product surfaces

Replace Mettle Lift and public IronPulse branding with Zor across mobile and web:

- App headers, settings, onboarding, authentication, empty states, legal/contact copy, accessibility labels, and user-facing errors.
- Native app configuration display name, splash/launcher asset references, permissions, notification content, and share metadata.
- Web page metadata, manifests, favicons, Open Graph metadata, app icons, login/account pages, email templates, and PWA presentation.
- Existing React Native logo components receive generated SVG path data or XML; native launcher surfaces use generated PNGs.

Light surfaces use the ink mark; dark surfaces use lime or bone according to existing contrast tokens. Existing layouts are not changed simply to accommodate the new brand.

### Compatibility contract

The rebrand preserves deployed and integration-facing identifiers:

- iOS/Android bundle IDs remain `com.ironpulse.app` and `com.ironpulse.app.e2e`.
- Existing EAS project identity remains unchanged.
- Existing database names/users, storage buckets, volumes, backup naming, `/opt/ironpulse`, deployed service identifiers, environment-variable keys, OAuth URLs, integration IDs, and repository paths remain unchanged.
- `zor://` becomes the primary deep-link scheme. `ironpulse://` remains a working legacy alias. `mettlelift://` does not require compatibility because it was not shipped.
- `zor.local` is the preferred developer hostname; `ironpulse.local` remains an alias where development configuration requires it.

This branch's Mettle identifiers are not compatibility targets: where they replaced original IronPulse production IDs, restore the original compatible IronPulse identifier rather than retaining Mettle Lift values.

## Developer and Documentation Migration

Rename safe developer-facing package and project labels to Zor: the root package name becomes `zor`, private package scopes become `@zor/*`, and current-facing README, contributor documentation, issue/PR templates, package metadata, titles, descriptions, badges, and product links use Zor. Historical changelog entries retain the names that were current when those changes happened.

Create a machine-readable legacy-name allowlist that records every allowed retained `ironpulse` occurrence and its compatibility reason. A brand-audit script fails for any `mettlelift` occurrence and for any `ironpulse` occurrence not covered by that allowlist. It excludes generated dependency directories, Git internals, historical changelog entries, and the allowlist itself only where documented by the rule.

The audit is intentionally scoped rather than performing blind global replacement, since production identifiers must remain stable.

## Delivery Sequence

1. **SVG foundation:** define canonical paths, build the deterministic generator, generate platform assets, and add focused visual/structural tests.
2. **Product cutover:** update mobile/web copy, configuration, deep links, metadata, notifications, email, and product logo consumers to Zor using the generated assets.
3. **Developer/deployment cleanup:** rename safe package/documentation branding, add the legacy-name allowlist and audit, and preserve operational identifiers.

Each phase is independently reviewable and reversible by reverting its commits. No customer-data migration is required.

## Verification and Acceptance

The implementation must provide automated checks that:

- Parse every canonical SVG and reject text nodes, embedded images, filters, gradients, and unexpected colors.
- Confirm each SVG has the expected viewBox, transparency behavior, and outlined lockup paths.
- Regenerate assets twice and confirm the manifest/hash output is reproducible.
- Validate generated dimensions, alpha/background expectations, Android safe-zone placement, and 16 px and 24 px small-mark snapshots.
- Validate app configuration: product display name is Zor, store-facing metadata is Zor Fitness where applicable, `zor://` is primary, and `ironpulse://` is retained.
- Run the legacy-name audit, proving no Mettle Lift references remain and every retained IronPulse reference is allowlisted.
- Run relevant web/mobile test suites. Known unrelated baseline failures must be documented separately and not attributed to this migration.

The approved PNG files in `assets/branding/` remain visual references until their SVG-derived replacements have passed these checks. They may then be retained only if documentation identifies them as legacy concept references; they are not runtime sources.

## Non-goals

- Changing training features, backend data, layouts, navigation, or interaction design.
- Renaming databases, buckets, hosts, service identifiers, repository remotes, or operational paths.
- Claiming store-name availability before verification in App Store Connect.
- Using generated raster images as a substitute for canonical SVG source files.
