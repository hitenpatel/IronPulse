import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors } from "@/lib/theme";

interface SparklineProps {
  data: number[];
  color?: string;
  fill?: boolean;
  height?: number;
  /** Viewport width is fixed to 120 for aspect preservation. */
  strokeWidth?: number;
}

/** Pure-function path computation — exported so we can unit test it. */
export function sparkPath(
  data: number[],
  width: number,
  height: number,
): { line: string; area: string } {
  if (data.length === 0) return { line: "", area: "" };
  if (data.length === 1) {
    const midY = height / 2;
    return {
      line: `M1 ${midY} L${width - 1} ${midY}`,
      area: `M1 ${midY} L${width - 1} ${midY} L${width - 1} ${height} L1 ${height} Z`,
    };
  }
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * (width - 2) + 1;
    const y = height - 2 - ((v - min) / range) * (height - 4);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = `${line} L ${last[0]} ${height} L ${first[0]} ${height} Z`;
  return { line, area };
}

export function Sparkline({
  data,
  color = colors.blue,
  fill = true,
  height = 32,
  strokeWidth = 1.6,
}: SparklineProps) {
  const width = 120;
  const { line, area } = sparkPath(data, width, height);
  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <View style={{ width: "100%", height }}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.35} />
            <Stop offset="1" stopColor={color} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {fill ? <Path d={area} fill={`url(#${gradientId})`} /> : null}
        <Path
          d={line}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}
