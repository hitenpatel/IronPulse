import { useEffect, useRef, useState } from "react";
import { Text, type TextStyle, type StyleProp } from "react-native";
import { fonts } from "@/lib/theme";

interface AnimatedNumberProps {
  /** Target value to count up to. */
  value: number;
  /** Format the displayed number. Default: Math.round toString. */
  format?: (v: number) => string;
  /** Animation duration in ms. Default 900. */
  duration?: number;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  fontFamily?: string;
}

// ease-out-cubic — matches the visual curve used elsewhere in reanimated springs
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Ticks a number from its previous displayed value to `value` over `duration`
 * ms using requestAnimationFrame. Re-animates whenever `value` changes.
 *
 * Stays on the JS thread because it's short (< 1s) and low-frequency (dashboard
 * mount). For hot paths (scroll-driven counters) switch to a reanimated TextInput.
 */
export function AnimatedNumber({
  value,
  format = (v) => String(Math.round(v)),
  duration = 900,
  size = 20,
  color,
  style,
  fontFamily = fonts.displaySemi,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = easeOutCubic(t);
      const current = from + (to - from) * eased;
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return (
    <Text
      style={[
        {
          fontSize: size,
          color,
          fontFamily,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    >
      {format(display)}
    </Text>
  );
}
