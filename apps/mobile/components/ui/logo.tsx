import { View, type ViewStyle, type StyleProp } from "react-native";
import { SvgXml } from "react-native-svg";
import { LOGO_XML } from "./logo-xml";

const ASPECT = 487 / 215;

interface LogoProps {
  /** Height in dp. Width scales from the logo's natural 487:215 aspect. */
  size?: number;
  /** @deprecated Kept so existing callers compile; not used. */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Logo({ size = 32, style }: LogoProps) {
  const width = Math.round(size * ASPECT);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="IronPulse"
      style={[{ width, height: size }, style]}
    >
      <SvgXml xml={LOGO_XML} width={width} height={size} />
    </View>
  );
}
