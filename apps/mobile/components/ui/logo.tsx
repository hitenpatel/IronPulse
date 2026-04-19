import Svg, {
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { colors } from "@/lib/theme";

interface LogoProps {
  /** Size in dp. The logo is a square — width and height both use this value. */
  size?: number;
  /**
   * Solid-colour fallback (no gradient or inset glow) — used for tiny
   * rendering (e.g. tab bar, header brand row) where the gradient
   * vanishes and wastes texels.
   */
  flat?: boolean;
}

/**
 * IronPulse v2 brand mark — cobalt-gradient tile + warm-white dumbbell +
 * electric-lime ECG pulse. Ported from
 * designs/design_handoff_new/reference/icons.jsx::Icons.Logo.
 *
 * Designed for a 40x40 viewBox so the geometry scales cleanly to any size.
 * Accessibility: decorative; the caller is responsible for adjacent text
 * ("IronPulse") that carries the semantic name.
 */
export function Logo({ size = 32, flat = false }: LogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <Defs>
        <LinearGradient id="ip-bg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#5F8BFF" />
          <Stop offset="0.55" stopColor="#3A6DFF" />
          <Stop offset="1" stopColor="#1E4BDC" />
        </LinearGradient>
        <LinearGradient id="ip-glow" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.2} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </LinearGradient>
      </Defs>

      {/* Rounded-square tile — cobalt */}
      <Rect
        x={1}
        y={1}
        width={38}
        height={38}
        rx={11}
        fill={flat ? "#3A6DFF" : "url(#ip-bg)"}
      />
      {!flat ? (
        <Rect x={1} y={1} width={38} height={20} rx={11} fill="url(#ip-glow)" />
      ) : null}
      <Rect
        x={1.5}
        y={1.5}
        width={37}
        height={37}
        rx={10.5}
        stroke="rgba(255,255,255,0.20)"
        strokeWidth={1}
        fill="none"
      />

      {/* Dumbbell — bar + plates in warm off-white (tokens.colors.text) */}
      <G stroke={colors.text} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <Path d="M9 20 H31" strokeWidth={2.4} />
        <Path d="M7 16.5 V23.5" strokeWidth={3.2} />
        <Path d="M10.5 14.5 V25.5" strokeWidth={3.2} />
        <Path d="M29.5 14.5 V25.5" strokeWidth={3.2} />
        <Path d="M33 16.5 V23.5" strokeWidth={3.2} />
      </G>

      {/* ECG pulse in electric lime */}
      <Path
        d="M11 20 L15 20 L17 15.5 L20 24.5 L22.5 17.5 L25 20 L29 20"
        stroke={colors.blue}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}
