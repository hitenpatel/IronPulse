import { View, Text, useWindowDimensions } from "react-native";
import Svg, { Polyline, Circle, Text as SvgText } from "react-native-svg";

interface WeightDataPoint {
  date: string;
  weight_kg: number;
}

interface WeightChartProps {
  data: WeightDataPoint[];
}

export function WeightChart({ data }: WeightChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 32; // 16px padding each side
  const chartHeight = 150;
  const paddingTop = 20;
  const paddingBottom = 20;
  const paddingLeft = 40;
  const paddingRight = 16;

  if (data.length === 0) {
    return (
      <View
        style={{
          height: chartHeight,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "hsl(215, 20%, 65%)" }}>
          No weight data yet
        </Text>
      </View>
    );
  }

  // Take last 30 points, reversed so oldest first
  const points = data.slice(0, 30).reverse();
  const weights = points.map((p) => p.weight_kg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const weightRange = maxWeight - minWeight || 1;

  const drawWidth = chartWidth - paddingLeft - paddingRight;
  const drawHeight = chartHeight - paddingTop - paddingBottom;

  const coords = points.map((p, i) => {
    const x =
      paddingLeft +
      (points.length > 1 ? (i / (points.length - 1)) * drawWidth : drawWidth / 2);
    const y =
      paddingTop +
      drawHeight -
      ((p.weight_kg - minWeight) / weightRange) * drawHeight;
    return { x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          color: "hsl(213, 31%, 91%)",
          fontWeight: "600",
          fontSize: 16,
          marginBottom: 8,
        }}
      >
        Weight Trend
      </Text>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Min / Max labels */}
        <SvgText
          x={4}
          y={paddingTop + 4}
          fontSize={10}
          fill="hsl(215, 20%, 65%)"
        >
          {maxWeight.toFixed(1)}
        </SvgText>
        <SvgText
          x={4}
          y={paddingTop + drawHeight + 4}
          fontSize={10}
          fill="hsl(215, 20%, 65%)"
        >
          {minWeight.toFixed(1)}
        </SvgText>

        {/* Line */}
        <Polyline
          points={polylinePoints}
          fill="none"
          stroke="hsl(217, 91%, 60%)"
          strokeWidth={2}
        />

        {/* Dots */}
        {coords.map((c, i) => (
          <Circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={3}
            fill="hsl(217, 91%, 60%)"
          />
        ))}
      </Svg>
    </View>
  );
}
