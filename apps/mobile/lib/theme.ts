// IronPulse design tokens — mirrors designs/design_handoff_new/reference/mobile.css
// v2 "acid sport" — electric lime primary, cobalt secondary, warm off-white text.
// Consume via `import { tokens } from "@/lib/theme"`.

import { Platform } from "react-native";

export const colors = {
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
  cardPaddingY: 12,
  cardPaddingX: 14,
  rowPaddingY: 11,
  rowPaddingX: 14,
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

export const tokens = { colors, radii, spacing, fonts, tracking, shadows };
