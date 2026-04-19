// IronPulse design tokens — mirrors designs/claude-design-handoff/mobile.css
// Consume via `import { tokens } from "@/lib/theme"`.

import { Platform } from "react-native";

export const colors = {
  bg: "#060B14",
  bg1: "#0B121D",
  bg2: "#111A28",
  bg3: "#172434",
  bg4: "#1E2D41",

  line: "#1C2838",
  line2: "#26344A",
  lineSoft: "#14202E",

  text: "#E7ECF3",
  text2: "#AEBAC9",
  text3: "#7A8698",
  text4: "#4F5A6D",

  blue: "#0077FF",
  blue2: "#3391FF",
  blueSoft: "rgba(0,119,255,0.14)",
  blueGlow: "rgba(0,119,255,0.35)",

  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.14)",
  purple: "#8B5CF6",
  purpleSoft: "rgba(139,92,246,0.14)",
  amber: "#F59E0B",
  amberSoft: "rgba(245,158,11,0.14)",
  red: "#EF4444",
  orange: "#F97316",
  pink: "#EC4899",

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

// Font families. TTFs live in apps/mobile/assets/fonts and are copied into
// android/app/src/main/assets/fonts via `npx react-native-asset`. The
// family names below match the file stems (Android resolves fontFamily
// by file stem). For bold/regular variants use the weight-specific family
// via the helpers below.
export const fonts = {
  // Primary family names — use with explicit weight via `fontFamily: fonts.displayMedium`.
  displayRegular: "SpaceGrotesk-Regular",
  displayMedium: "SpaceGrotesk-Medium",
  displaySemi: "SpaceGrotesk-SemiBold",
  displayBold: "SpaceGrotesk-Bold",

  bodyRegular: "Inter-Regular",
  bodyMedium: "Inter-Medium",
  bodySemi: "Inter-SemiBold",

  monoRegular: "JetBrainsMono-Regular",
  monoMedium: "JetBrainsMono-Medium",
  monoSemi: "JetBrainsMono-SemiBold",

  // Legacy aliases — components built before the font swap referenced these.
  // They resolve to the default weight for each family.
  display: "SpaceGrotesk-Medium",
  body: "Inter-Regular",
  mono: "JetBrainsMono-Regular",
} as const;

// Letter-spacing helpers (RN uses absolute values, not em). Designed at a
// 13-14px baseline body.
export const tracking = {
  displayTight: -0.5, // ~-0.025em at 20-30px
  bodyTight: -0.1,
  caps: 1.6, // +0.12em at 13px ~= 1.56
  capsWide: 2,
} as const;

export const shadows = {
  primaryButton: Platform.select({
    android: { elevation: 4 },
    ios: {
      shadowColor: colors.blue,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
    },
    default: {},
  })!,
  fab: Platform.select({
    android: { elevation: 8 },
    ios: {
      shadowColor: colors.blue,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
    },
    default: {},
  })!,
} as const;

export const tokens = { colors, radii, spacing, fonts, tracking, shadows };
