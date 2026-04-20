// IronPulse design tokens — mirrors designs/design_handoff_new/reference/mobile.css
// v2 "acid sport" — electric lime primary, cobalt secondary, warm off-white text.
//
// Consume via:
//   - `import { colors } from "@/lib/theme"` → dark (static, legacy call sites)
//   - `import { useColors } from "@/lib/theme-context"` → theme-reactive
//
// See theme-context.tsx for the light/dark toggle infrastructure.

import { Platform } from "react-native";

export const darkColors = {
  // Ink surfaces — cool near-black with subtle blue undertone
  bg: "#0B0D12",
  bg1: "#13161E",
  bg2: "#1B1F29",
  bg3: "#252A38",
  bg4: "#323848",

  line: "#252A38",
  line2: "#323848",
  lineSoft: "#181B24",

  // Warm off-white type — NEVER pure white
  text: "#F4F0E6",
  text2: "#D4D1C6",
  text3: "#A6A49C",
  text4: "#8F8D86",

  // PRIMARY = electric lime. Mapped to the `blue` slot for code compat with v1.
  blue: "#D4FF3A",
  blue2: "#C4EF2A",
  blueSoft: "rgba(212,255,58,0.16)",
  blueGlow: "rgba(212,255,58,0.45)",
  /** Text/icon colour that sits ON a lime surface. NEVER use white here — lime-on-white is illegible. */
  blueInk: "#0F1508",

  // SECONDARY = cobalt blue. Mapped to the `green` slot for code compat with v1.
  green: "#3A6DFF",
  greenSoft: "rgba(58,109,255,0.16)",

  // TERTIARY = warm cream highlight
  purple: "#F4F0E6",
  purpleSoft: "rgba(244,240,230,0.10)",

  amber: "#FFB800",
  amberSoft: "rgba(255,184,0,0.14)",
  red: "#FF3D5A",
  orange: "#FF7A3C",
  pink: "#FF3D5A",
  cyan: "#4FD1E8",
  cyanSoft: "rgba(79,209,232,0.14)",

  white: "#FFFFFF",
} as const;

// Light-mode palette — mirrors darkColors by key so consumers can swap
// wholesale via useColors(). Lime primary + cobalt secondary keep their
// brand identity; backgrounds flip to warm off-whites and text inverts to
// near-black for legibility on bright surfaces.
export const lightColors: typeof darkColors = {
  bg: "#F9F4E1",
  bg1: "#FFFBEE",
  bg2: "#F2ECD6",
  bg3: "#E8E1C6",
  bg4: "#D4CBAE",

  line: "#D4CBAE",
  line2: "#BDB499",
  lineSoft: "#EBE4CE",

  text: "#0F1508",
  text2: "#2A3020",
  text3: "#525845",
  text4: "#6E7561",

  blue: "#C4EF2A",
  blue2: "#B2DC1E",
  blueSoft: "rgba(196,239,42,0.30)",
  blueGlow: "rgba(196,239,42,0.55)",
  blueInk: "#0F1508",

  green: "#2553D6",
  greenSoft: "rgba(37,83,214,0.16)",

  purple: "#2A2416",
  purpleSoft: "rgba(42,36,22,0.08)",

  amber: "#CC9500",
  amberSoft: "rgba(204,149,0,0.18)",
  red: "#D0253F",
  orange: "#CC5A1E",
  pink: "#D0253F",
  cyan: "#0E8FA8",
  cyanSoft: "rgba(14,143,168,0.14)",

  white: "#FFFFFF",
} as const;

// Keep `colors` as an alias for darkColors so legacy call sites (hundreds of
// imports) keep compiling against the dark palette until they're migrated
// to useColors(). New code should use useColors() from theme-context.
export const colors = darkColors;

export const radii = {
  card: 14,
  rowList: 14,
  button: 10,
  buttonSm: 6,
  chip: 999,
  tag: 5,
  fab: 16,
  iconTile: 8,
  avatar: 999,
} as const;

export const spacing = {
  gutter: 16,
  cardPaddingY: 16,
  cardPaddingX: 18,
  rowPaddingY: 14,
  rowPaddingX: 16,
  // Minimum interactive target — iOS HIG and Material 3 both recommend 48dp.
  touchTarget: 48,
} as const;

// Type scale, grounded in iOS HIG + Material 3. Prefer these over literals
// so sizes stay consistent across screens. New screens should import these;
// legacy screens migrate opportunistically.
export const typography = {
  // Hero — login, onboarding, empty-state headlines. iOS Large Title-ish.
  hero: { size: 42, lineHeight: 48, letterSpacing: -1.4 },
  // Screen titles / section heroes — iOS Title 1 / M3 Headline Large-ish.
  display: { size: 28, lineHeight: 34, letterSpacing: -0.6 },
  // Sub-titles, card headers — iOS Title 2-ish.
  title: { size: 22, lineHeight: 28, letterSpacing: -0.4 },
  // Primary body — iOS Body 17, M3 Body Large 16. We pick 16 for density.
  body: { size: 16, lineHeight: 22, letterSpacing: -0.1 },
  // Secondary body / row descriptions — iOS Callout.
  bodySmall: { size: 14, lineHeight: 20, letterSpacing: 0 },
  // Labels, captions — iOS Footnote / M3 Label Medium.
  caption: { size: 13, lineHeight: 17, letterSpacing: 0 },
  // Eyebrow / section labels — uppercase, loose tracking.
  eyebrow: { size: 11, lineHeight: 14, letterSpacing: 1.2 },
  // Tab bar labels — Material 3 Label Medium.
  tabLabel: { size: 12, lineHeight: 15, letterSpacing: 0 },
} as const;

// Font families. Instrument Sans replaces Inter as the body family in v2.
// The file stems live in apps/mobile/assets/fonts and are copied into
// android/app/src/main/assets/fonts by `npx react-native-asset`.
export const fonts = {
  // Display — Space Grotesk (unchanged from v1)
  displayRegular: "SpaceGrotesk-Regular",
  displayMedium: "SpaceGrotesk-Medium",
  displaySemi: "SpaceGrotesk-SemiBold",
  displayBold: "SpaceGrotesk-Bold",

  // Body — Instrument Sans (was Inter in v1)
  bodyRegular: "InstrumentSans-Regular",
  bodyMedium: "InstrumentSans-Medium",
  bodySemi: "InstrumentSans-SemiBold",
  bodyBold: "InstrumentSans-Bold",

  // Mono — JetBrains Mono (unchanged)
  monoRegular: "JetBrainsMono-Regular",
  monoMedium: "JetBrainsMono-Medium",
  monoSemi: "JetBrainsMono-SemiBold",

  // Legacy aliases kept for any callers that predate the weight-specific tokens.
  display: "SpaceGrotesk-Medium",
  body: "InstrumentSans-Regular",
  mono: "JetBrainsMono-Regular",
} as const;

export const tracking = {
  displayTight: -0.5,
  bodyTight: -0.1,
  caps: 1.6,
  capsWide: 2,
} as const;

export const shadows = {
  primaryButton: Platform.select({
    android: { elevation: 4 },
    ios: {
      shadowColor: colors.blue,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
    },
    default: {},
  })!,
  fab: Platform.select({
    android: { elevation: 8 },
    ios: {
      shadowColor: colors.blue,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.45,
      shadowRadius: 14,
    },
    default: {},
  })!,
} as const;

export const tokens = { colors, radii, spacing, fonts, tracking, shadows, typography };
