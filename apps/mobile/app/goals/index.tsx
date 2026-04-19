import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  Activity,
  Calendar as CalendarIcon,
  Check,
  Dumbbell,
  Plus,
  Scale,
  Target,
  Trash2,
  Trophy,
} from "lucide-react-native";

import { trpc } from "@/lib/trpc";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import {
  BigNum,
  Button,
  Chip,
  SegmentedControl,
  TopBar,
  UppercaseLabel,
} from "@/components/ui";

type GoalType = "body_weight" | "exercise_pr" | "weekly_workouts" | "cardio_distance";
type GoalUnit = "kg" | "lb" | "count" | "km" | "mi";

const GOAL_TYPES: {
  value: GoalType;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  tone: "blue" | "green" | "amber" | "purple";
}[] = [
  { value: "body_weight", label: "Body weight", icon: Scale, tone: "blue" },
  { value: "exercise_pr", label: "Exercise PR", icon: Dumbbell, tone: "amber" },
  { value: "weekly_workouts", label: "Weekly workouts", icon: CalendarIcon, tone: "green" },
  { value: "cardio_distance", label: "Cardio distance", icon: Activity, tone: "purple" },
];

const UNITS_FOR_TYPE: Record<GoalType, GoalUnit[]> = {
  body_weight: ["kg", "lb"],
  exercise_pr: ["kg", "lb"],
  weekly_workouts: ["count"],
  cardio_distance: ["km", "mi"],
};

type GoalListResult = Awaited<ReturnType<typeof trpc.goal.list.query>>;
type Goal = GoalListResult["goals"][number];

type Tab = "active" | "done" | "paused";

function iconFor(type: string) {
  return GOAL_TYPES.find((t) => t.value === type)?.icon ?? Target;
}
function toneFor(type: string) {
  return GOAL_TYPES.find((t) => t.value === type)?.tone ?? "blue";
}

export default function GoalsScreen() {
  const navigation = useNavigation();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("active");

  // Form state
  const [type, setType] = useState<GoalType>("body_weight");
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [startValue, setStartValue] = useState("");
  const [unit, setUnit] = useState<GoalUnit>("kg");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await trpc.goal.list.query({});
      setGoals(result.goals);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const counts = useMemo(
    () => ({
      active: goals.filter((g) => g.status === "active").length,
      done: goals.filter((g) => g.status === "completed").length,
      paused: goals.filter((g) => g.status === "paused").length,
    }),
    [goals],
  );

  const visible = useMemo(() => {
    switch (tab) {
      case "active":
        return goals.filter((g) => g.status === "active");
      case "done":
        return goals.filter((g) => g.status === "completed");
      case "paused":
        return goals.filter((g) => g.status === "paused");
    }
  }, [tab, goals]);

  function handleTypeChange(next: GoalType) {
    setType(next);
    setUnit(UNITS_FOR_TYPE[next][0]!);
  }

  async function handleCreate() {
    if (!title.trim() || !targetValue) return;
    setSaving(true);
    try {
      await trpc.goal.create.mutate({
        type,
        title: title.trim(),
        targetValue: Number(targetValue),
        ...(startValue !== "" && { startValue: Number(startValue) }),
        unit,
      });
      setTitle("");
      setTargetValue("");
      setStartValue("");
      setShowForm(false);
      await load();
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create goal");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkComplete(id: string) {
    setSavingId(id);
    try {
      await trpc.goal.update.mutate({ id, status: "completed" });
      await load();
    } catch {
      Alert.alert("Error", "Failed to update goal");
    } finally {
      setSavingId(null);
    }
  }

  function handleDelete(id: string, title: string) {
    Alert.alert("Delete Goal", `Delete "${title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setSavingId(id);
          try {
            await trpc.goal.delete.mutate({ id });
            await load();
          } catch {
            Alert.alert("Error", "Failed to delete goal");
          } finally {
            setSavingId(null);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32 }}>
          <TopBar
            title="Goals"
            onBack={() => navigation.goBack()}
            right={
              <Pressable
                onPress={() => setShowForm((s) => !s)}
                hitSlop={6}
                accessibilityLabel="New goal"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: showForm ? colors.bg2 : colors.blue,
                  borderWidth: 1,
                  borderColor: showForm ? colors.line : colors.blue,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus
                  size={16}
                  color={showForm ? colors.text2 : colors.white}
                  style={{
                    transform: [{ rotate: showForm ? "45deg" : "0deg" }],
                  }}
                />
              </Pressable>
            }
          />

          <SegmentedControl<Tab>
            items={[
              { key: "active", label: `Active · ${counts.active}` },
              { key: "done", label: `Done · ${counts.done}` },
              { key: "paused", label: `Paused · ${counts.paused}` },
            ]}
            activeKey={tab}
            onChange={setTab}
          />

          {/* Create form */}
          {showForm && (
            <View
              style={{
                backgroundColor: colors.bg1,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                padding: 14,
                gap: 12,
                marginTop: 14,
              }}
            >
              <UppercaseLabel>New goal</UppercaseLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {GOAL_TYPES.map((gt) => {
                  const Icon = gt.icon;
                  const active = type === gt.value;
                  return (
                    <Pressable
                      key={gt.value}
                      onPress={() => handleTypeChange(gt.value)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                        backgroundColor: active ? colors.blueSoft : colors.bg2,
                        borderWidth: 1,
                        borderColor: active ? colors.blue : colors.line,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        minWidth: "47%",
                      }}
                    >
                      <Icon size={14} color={active ? colors.blue2 : colors.text3} />
                      <Text
                        style={{
                          color: active ? colors.blue2 : colors.text2,
                          fontSize: 12,
                          fontFamily: fonts.bodyMedium,
                        }}
                      >
                        {gt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <LabeledInput label="Title" value={title} onChangeText={setTitle} />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Target"
                    keyboardType="decimal-pad"
                    value={targetValue}
                    onChangeText={setTargetValue}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <LabeledInput
                    label="Start"
                    keyboardType="decimal-pad"
                    value={startValue}
                    onChangeText={setStartValue}
                  />
                </View>
                <View style={{ width: 84 }}>
                  <UppercaseLabel style={{ marginBottom: 6 }}>Unit</UppercaseLabel>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {UNITS_FOR_TYPE[type].map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => setUnit(u)}
                        style={{
                          flex: 1,
                          paddingVertical: 9,
                          borderWidth: 1,
                          borderColor: unit === u ? colors.blue : colors.line,
                          backgroundColor: unit === u ? colors.blueSoft : colors.bg2,
                          borderRadius: radii.buttonSm,
                          alignItems: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: unit === u ? colors.blue2 : colors.text3,
                            fontSize: 11,
                            fontFamily: fonts.monoMedium,
                          }}
                        >
                          {u}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="primary"
                    onPress={handleCreate}
                    disabled={saving || !title.trim() || !targetValue}
                  >
                    {saving ? "Creating…" : "Create"}
                  </Button>
                </View>
                <Button variant="ghost" onPress={() => setShowForm(false)} style={{ paddingHorizontal: 18 }}>
                  Cancel
                </Button>
              </View>
            </View>
          )}

          {/* List */}
          <View style={{ marginTop: 14, gap: 10 }}>
            {loading ? (
              <ActivityIndicator color={colors.text3} />
            ) : visible.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 40, gap: 10 }}>
                <Target size={32} color={colors.text4} />
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: 13,
                    fontFamily: fonts.bodyRegular,
                  }}
                >
                  {tab === "active"
                    ? "No active goals. Set a target to stay motivated."
                    : tab === "done"
                      ? "No completed goals yet."
                      : "No paused goals."}
                </Text>
              </View>
            ) : (
              visible.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  saving={savingId === goal.id}
                  onMarkComplete={() => handleMarkComplete(goal.id)}
                  onDelete={() => handleDelete(goal.id, goal.title)}
                />
              ))
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function GoalCard({
  goal,
  saving,
  onMarkComplete,
  onDelete,
}: {
  goal: Goal;
  saving: boolean;
  onMarkComplete: () => void;
  onDelete: () => void;
}) {
  const Icon = iconFor(goal.type);
  const tone = toneFor(goal.type);
  const isComplete = goal.status === "completed";

  return (
    <View
      style={{
        backgroundColor: colors.bg1,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        padding: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor:
              tone === "blue"
                ? colors.blueSoft
                : tone === "amber"
                  ? colors.amberSoft
                  : tone === "green"
                    ? colors.greenSoft
                    : colors.purpleSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            size={16}
            color={
              tone === "blue"
                ? colors.blue2
                : tone === "amber"
                  ? colors.amber
                  : tone === "green"
                    ? colors.green
                    : colors.purple
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              color: colors.text,
              fontFamily: fonts.displaySemi,
              fontSize: 14,
              letterSpacing: -0.2,
            }}
          >
            {goal.title}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <Chip tone={tone}>{goal.type.replace(/_/g, " ")}</Chip>
            {goal.targetDate ? (
              <Text style={{ fontSize: 10, color: colors.text4, fontFamily: fonts.monoRegular }}>
                by {new Date(goal.targetDate).toLocaleDateString()}
              </Text>
            ) : null}
          </View>
        </View>
        <BigNum size={20} color={isComplete ? colors.green : colors.text}>
          {goal.progressPct}
        </BigNum>
        <Text style={{ fontSize: 10, color: colors.text3, marginLeft: -4 }}>%</Text>
      </View>

      {/* Progress rail */}
      <View
        style={{
          height: 6,
          borderRadius: 3,
          backgroundColor: colors.bg3,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: "100%",
            width: `${Math.max(0, Math.min(100, goal.progressPct))}%`,
            backgroundColor: isComplete ? colors.green : colors.blue,
            borderRadius: 3,
          }}
        />
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 6 }}>
        <Text style={{ fontSize: 10, color: colors.text4, fontFamily: fonts.monoRegular }}>
          {Number(goal.currentValue).toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
          {goal.unit}
        </Text>
        <Text style={{ fontSize: 10, color: colors.text4, fontFamily: fonts.monoRegular }}>
          {Number(goal.targetValue).toLocaleString(undefined, { maximumFractionDigits: 1 })}{" "}
          {goal.unit}
        </Text>
      </View>

      {goal.isComplete && goal.status === "active" ? (
        <View style={{ marginTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
          <Pressable onPress={onMarkComplete} disabled={saving} style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
            <Check size={13} color={colors.green} />
            <Text style={{ color: colors.green, fontSize: 12, fontFamily: fonts.bodySemi }}>
              Mark complete
            </Text>
          </Pressable>
          <Pressable onPress={onDelete} disabled={saving} hitSlop={6}>
            <Trash2 size={14} color={colors.text4} />
          </Pressable>
        </View>
      ) : (
        <View style={{ marginTop: 10, alignItems: "flex-end" }}>
          <Pressable onPress={onDelete} disabled={saving} hitSlop={6}>
            {isComplete ? <Trophy size={14} color={colors.amber} /> : <Trash2 size={14} color={colors.text4} />}
          </Pressable>
        </View>
      )}
    </View>
  );
}

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  keyboardType?: "decimal-pad";
}) {
  return (
    <View>
      <UppercaseLabel style={{ marginBottom: 6 }}>{label}</UppercaseLabel>
      <TextInput
        style={{
          backgroundColor: colors.bg2,
          borderWidth: 1,
          borderColor: colors.line,
          borderRadius: radii.button,
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: colors.text,
          fontSize: 14,
          fontFamily: fonts.bodyRegular,
        }}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.text4}
      />
    </View>
  );
}
