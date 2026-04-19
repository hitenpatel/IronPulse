import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Rect } from "react-native-svg";
import { ArrowUp, ChevronDown } from "lucide-react-native";
import { useQuery } from "@powersync/react";

import { trpc } from "@/lib/trpc";
import { colors, fonts, radii, spacing, tracking } from "@/lib/theme";
import {
  BigNum,
  Card,
  Chip,
  SegmentedControl,
  Sparkline,
  TopBar,
  UppercaseLabel,
} from "@/components/ui";

type Range = "4w" | "12w" | "1y";

interface FitnessStatus {
  atl: number;
  ctl: number;
  tsb: number;
  status: string;
}

interface MuscleVolume {
  muscle: string;
  volume: number;
  percentage: number;
}

interface WeeklyVolumeRow {
  week: string;
  totalVolume: number;
}

interface PrRow {
  id: string;
  exercise_id: string;
  exercise_name: string;
  type: string;
  value: number;
  achieved_at: string;
}

const RANGE_TO_WEEKS: Record<Range, number> = { "4w": 4, "12w": 12, "1y": 52 };

export default function StatsScreen() {
  const [range, setRange] = useState<Range>("12w");
  const [fitnessStatus, setFitnessStatus] = useState<FitnessStatus | null>(null);
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolume[]>([]);
  const [weeklyVolume, setWeeklyVolume] = useState<WeeklyVolumeRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [statusRes, volumeRes, weeklyRes] = await Promise.all([
          trpc.analytics.fitnessStatus.query(),
          trpc.analytics.muscleVolume.query({ days: 7 }),
          trpc.analytics.weeklyVolume.query({ weeks: RANGE_TO_WEEKS[range] }),
        ]);
        if (cancelled) return;
        setFitnessStatus(statusRes);
        setMuscleVolume(volumeRes.data.slice(0, 5));
        // weeklyVolume returns per-muscle-group rows; sum per week for the bar chart
        const byWeek = new Map<string, number>();
        for (const row of weeklyRes.data) {
          byWeek.set(row.week, (byWeek.get(row.week) ?? 0) + row.totalVolume);
        }
        setWeeklyVolume(
          Array.from(byWeek.entries())
            .map(([week, totalVolume]) => ({ week, totalVolume }))
            .sort((a, b) => a.week.localeCompare(b.week)),
        );
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Records — most recent 5 PRs from PowerSync.
  const { data: prData } = useQuery<PrRow>(
    `SELECT pr.id, pr.exercise_id, pr.type, pr.value, pr.achieved_at, e.name AS exercise_name
       FROM personal_records pr
       LEFT JOIN exercises e ON e.id = pr.exercise_id
      ORDER BY pr.achieved_at DESC
      LIMIT 5`,
    [],
  );
  const records = prData ?? [];

  // Hero metric — pick the highest-value PR as the featured exercise.
  const hero = useMemo(() => {
    if (records.length === 0) return null;
    const top = [...records].sort((a, b) => b.value - a.value)[0];
    return { name: top.exercise_name ?? "Top lift", value: top.value, type: top.type };
  }, [records]);

  // Build a cheap sparkline from weekly volume (tons) — replaces the real
  // exercise-trend line we don't have the data shape for yet.
  const heroSpark = useMemo(() => {
    if (weeklyVolume.length === 0) return [1, 1.1, 1.2];
    return weeklyVolume.map((w) => w.totalVolume / 1000);
  }, [weeklyVolume]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={{ paddingHorizontal: spacing.gutter }}>
          <TopBar
            title="Stats"
            right={
              <SegmentedControl<Range>
                dense
                items={[
                  { key: "4w", label: "4w" },
                  { key: "12w", label: "12w" },
                  { key: "1y", label: "1y" },
                ]}
                activeKey={range}
                onChange={setRange}
              />
            }
          />

          {/* Hero metric */}
          <Card style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <UppercaseLabel>
                {hero ? `${hero.name} · ${hero.type.replace(/_/g, " ").toLowerCase()}` : "Top lift"}
              </UppercaseLabel>
              <ChevronDown size={14} color={colors.text3} />
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: 6, gap: 5 }}>
              <BigNum size={36}>{hero ? String(hero.value) : "—"}</BigNum>
              <Text style={{ fontSize: 12, color: colors.text3, fontFamily: fonts.bodyRegular }}>kg</Text>
              {weeklyVolume.length >= 2 ? (
                <View
                  style={{
                    marginLeft: "auto",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 2,
                  }}
                >
                  <ArrowUp size={11} color={colors.green} />
                  <Text style={{ fontSize: 11, color: colors.green, fontFamily: fonts.bodyMedium }}>
                    {computeDelta(weeklyVolume)}
                  </Text>
                </View>
              ) : null}
            </View>
            <View style={{ marginTop: 10, marginHorizontal: -4 }}>
              <Sparkline data={heroSpark} height={50} color={colors.blue} strokeWidth={1.8} />
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginTop: 2,
              }}
            >
              <Text style={{ color: colors.text4, fontSize: 9, fontFamily: fonts.monoRegular }}>
                {range}
              </Text>
              <Text style={{ color: colors.text4, fontSize: 9, fontFamily: fonts.monoRegular }}>
                now
              </Text>
            </View>
          </Card>

          {/* Training status */}
          <Card style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <UppercaseLabel>Training status</UppercaseLabel>
              {fitnessStatus ? (
                <Chip tone={fitnessStatusTone(fitnessStatus.status)} dot>
                  {fitnessStatus.status}
                </Chip>
              ) : null}
            </View>
            {loading ? (
              <ActivityIndicator color={colors.text3} />
            ) : fitnessStatus ? (
              <View style={{ flexDirection: "row", gap: 8 }}>
                <StatusCell label="Fatigue" sub="ATL" value={fitnessStatus.atl.toFixed(1)} color={colors.amber} />
                <StatusCell label="Fitness" sub="CTL" value={fitnessStatus.ctl.toFixed(1)} color={colors.blue2} />
                <StatusCell label="Form" sub="TSB" value={fitnessStatus.tsb.toFixed(1)} color={colors.purple} />
              </View>
            ) : (
              <Text style={{ color: colors.text3, fontSize: 12, fontFamily: fonts.bodyRegular }}>
                Not enough training data yet.
              </Text>
            )}
          </Card>

          {/* Weekly volume */}
          <Card style={{ marginBottom: 10 }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 10,
              }}
            >
              <UppercaseLabel>Weekly volume</UppercaseLabel>
              {weeklyVolume.length > 0 ? (
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
                  <BigNum size={16}>
                    {(weeklyVolume[weeklyVolume.length - 1]!.totalVolume / 1000).toFixed(1)}
                  </BigNum>
                  <Text style={{ fontSize: 9, color: colors.text3, fontFamily: fonts.monoRegular }}>
                    t · wk {weeklyVolume.length}
                  </Text>
                </View>
              ) : null}
            </View>
            {weeklyVolume.length > 0 ? (
              <WeeklyVolumeBars data={weeklyVolume} />
            ) : (
              <Text style={{ color: colors.text3, fontSize: 12, fontFamily: fonts.bodyRegular }}>
                Log a few sessions to see your weekly load.
              </Text>
            )}
          </Card>

          {/* Top muscle groups */}
          <Card style={{ marginBottom: 10 }}>
            <UppercaseLabel style={{ marginBottom: 12 }}>Top muscle groups · 7d</UppercaseLabel>
            {loading ? (
              <ActivityIndicator color={colors.text3} />
            ) : muscleVolume.length > 0 ? (
              muscleVolume.map((m) => (
                <View key={m.muscle} style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                    <Text
                      style={{
                        color: colors.text2,
                        fontSize: 11.5,
                        fontFamily: fonts.bodyMedium,
                        textTransform: "capitalize",
                      }}
                    >
                      {m.muscle}
                    </Text>
                    <Text
                      style={{
                        color: colors.text3,
                        fontSize: 10.5,
                        fontFamily: fonts.monoRegular,
                      }}
                    >
                      {m.percentage}%
                    </Text>
                  </View>
                  <View style={{ height: 3, backgroundColor: colors.bg3, borderRadius: 2 }}>
                    <View
                      style={{
                        width: `${Math.max(0, Math.min(100, m.percentage))}%`,
                        height: 3,
                        backgroundColor: colors.blue,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ color: colors.text3, fontSize: 12, fontFamily: fonts.bodyRegular }}>
                Log some sets to see muscle-group breakdowns.
              </Text>
            )}
          </Card>

          {/* Records */}
          <UppercaseLabel style={{ marginTop: 12, marginBottom: 6 }}>Records</UppercaseLabel>
          {records.length === 0 ? (
            <Card>
              <Text
                style={{
                  color: colors.text3,
                  fontSize: 12,
                  textAlign: "center",
                  paddingVertical: 20,
                  fontFamily: fonts.bodyRegular,
                }}
              >
                Complete a set to set your first PR.
              </Text>
            </Card>
          ) : (
            records.map((r) => (
              <View
                key={r.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  paddingVertical: 9,
                  paddingHorizontal: 12,
                  backgroundColor: colors.bg1,
                  borderWidth: 1,
                  borderColor: colors.lineSoft,
                  borderRadius: 10,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    flex: 1.3,
                    fontSize: 11.5,
                    color: colors.text,
                    fontFamily: fonts.bodyMedium,
                  }}
                >
                  {r.exercise_name ?? "Lift"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", width: 70 }}>
                  <BigNum size={13}>{String(r.value)}</BigNum>
                  <Text style={{ fontSize: 8, color: colors.text3, marginLeft: 2, fontFamily: fonts.monoRegular }}>
                    {r.type.includes("rep") ? "r" : "kg"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Sparkline data={[0.8, 0.85, 0.9, 0.95, 1]} height={20} color={colors.blue} fill={false} strokeWidth={1.4} />
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusCell({
  label,
  sub,
  value,
  color,
}: {
  label: string;
  sub: string;
  value: string;
  color: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          color: colors.text4,
          fontSize: 9,
          fontFamily: fonts.monoRegular,
          letterSpacing: 1.2,
        }}
      >
        {sub}
      </Text>
      <BigNum size={22} color={color} style={{ marginTop: 2 }}>
        {value}
      </BigNum>
      <Text style={{ color: colors.text3, fontSize: 9.5, marginTop: 1, fontFamily: fonts.bodyRegular }}>
        {label}
      </Text>
    </View>
  );
}

function WeeklyVolumeBars({ data }: { data: WeeklyVolumeRow[] }) {
  const max = Math.max(...data.map((d) => d.totalVolume)) * 1.1 || 1;
  const last = data.length - 1;
  const width = 240;
  const height = 70;
  const barW = Math.max(4, (width - 8) / Math.max(1, data.length) - 2);
  const gap = 2;

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const bh = (d.totalVolume / max) * (height - 10);
        const x = 2 + i * (barW + gap);
        const y = height - bh - 2;
        const active = i === last;
        return <Rect key={d.week} x={x} y={y} width={barW} height={bh} rx={2} fill={active ? colors.blue : colors.bg3} />;
      })}
    </Svg>
  );
}

function fitnessStatusTone(status: string): "green" | "amber" | "blue" | "purple" {
  switch (status) {
    case "Fresh":
      return "green";
    case "Optimal":
      return "blue";
    case "Fatigued":
      return "amber";
    case "Overreaching":
      return "amber";
    default:
      return "blue";
  }
}

function computeDelta(data: WeeklyVolumeRow[]): string {
  if (data.length < 2) return "0%";
  const first = data[0]!.totalVolume;
  const last = data[data.length - 1]!.totalVolume;
  if (first === 0) return "—";
  const pct = ((last - first) / first) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}
