import { Image, type ImageStyle, type StyleProp } from "react-native";

interface LogoProps {
  /** Size in dp. The logo renders square — width and height both use this value. */
  size?: number;
  /**
   * @deprecated Kept for backwards compatibility with the v2 SVG Logo — the
   * PNG asset is a single baked-in rendition that already reads well at small
   * sizes. Accepting but ignoring the prop so existing callers still compile.
   */
  flat?: boolean;
  style?: StyleProp<ImageStyle>;
}

/**
 * IronPulse brand mark. Renders the canonical PNG asset from
 * `apps/mobile/assets/logo-mark.png`, which mirrors
 * `designs/IronPulse-logo.png` (cream tile + cobalt dumbbell outline + lime
 * ECG pulse). Kept as a dedicated component so callers can swap the
 * implementation (PNG → SVG → animated) without touching every screen.
 */
export function Logo({ size = 32, style }: LogoProps) {
  return (
    <Image
      source={require("../../assets/logo-mark.png")}
      style={[{ width: size, height: size }, style]}
      accessibilityLabel="IronPulse"
      resizeMode="contain"
    />
  );
}
