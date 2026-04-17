import React, { useCallback, useState } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
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

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  border: "#1E2B47",
  borderSubtle: "#152035",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  primary: "#0077FF",
  success: "#22C55E",
  gold: "#F59E0B",
  error: "#EF4444",
};

type GoalType = "body_weight" | "exercise_pr" | "weekly_workouts" | "cardio_distance";
type GoalUnit = "kg" | "lb" | "count" | "km" | "mi";

const GOAL_TYPES: {
  value: GoalType;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { value: "body_weight", label: "Body Weight", icon: Scale },
  { value: "exercise_pr", label: "Exercise PR", icon: Dumbbell },
  { value: "weekly_workouts", label: "Weekly Workouts", icon: CalendarIcon },
  { value: "cardio_distance", label: "Cardio Distance", icon: Activity },
];

const UNITS_FOR_TYPE: Record<GoalType, GoalUnit[]> = {
  body_weight: ["kg", "lb"],
  exercise_pr: ["kg", "lb"],
  weekly_workouts: ["count"],
  cardio_distance: ["km", "mi"],
};

type GoalListResult = Awaited<ReturnType<typeof trpc.goal.list.query>>;
type Goal = GoalListResult["goals"][number];

function iconFor(type: string) {
  return GOAL_TYPES.find((t) => t.value === type)?.icon ?? Target;
}

export default function GoalsScreen() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Form
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
      // keep stale
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleTypeChange(next: GoalType) {
    setType(next);
    setUnit(UNITS_FOR_TYPE[next][0]);
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

  const active = goals.filter((g) => g.status === "active");
  const completed = goals.filter((g) => g.status === "completed");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Create button */}
          {!showForm && (
            <Pressable
              onPress={() => setShowForm(true)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: colors.primary,
                borderRadius: 10,
                height: 46,
              }}
            >
              <Plus size={18} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                New Goal
              </Text>
            </Pressable>
          )}

          {/* Form */}
          {showForm && (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                gap: 12,
              }}
            >
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                Create Goal
              </Text>

              {/* Type grid */}
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
                        backgroundColor: active ? colors.primary + "22" : colors.accent,
                        borderWidth: 1,
                        borderColor: active ? colors.primary : colors.border,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        minWidth: "47%",
                      }}
                    >
                      <Icon size={14} color={active ? colors.primary : colors.mutedFg} />
                      <Text
                        style={{
                          color: active ? colors.primary : colors.mutedFg,
                          fontSize: 13,
                          fontWeight: "500",
                        }}
                      >
                        {gt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={{
                  backgroundColor: colors.accent,
                  borderWidth: 1,
                  borderColor: colors.border,
                  borderRadius: 8,
                  height: 44,
                  paddingHorizontal: 12,
                  color: colors.foreground,
                  fontSize: 15,
                }}
                placeholder="Goal title"
                placeholderTextColor={colors.dimFg}
                value={title}
                onChangeText={setTitle}
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.dimFg,
                      fontSize: 10,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Target
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.accent,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      height: 40,
                      paddingHorizontal: 10,
                      color: colors.foreground,
                      fontSize: 14,
                    }}
                    value={targetValue}
                    onChangeText={setTargetValue}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.dimFg,
                      fontSize: 10,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Start
                  </Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.accent,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      height: 40,
                      paddingHorizontal: 10,
                      color: colors.foreground,
                      fontSize: 14,
                    }}
                    value={startValue}
                    onChangeText={setStartValue}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ width: 80 }}>
                  <Text
                    style={{
                      color: colors.dimFg,
                      fontSize: 10,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Unit
                  </Text>
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {UNITS_FOR_TYPE[type].map((u) => (
                      <Pressable
                        key={u}
                        onPress={() => setUnit(u)}
                        style={{
                          flex: 1,
                          height: 40,
                          borderWidth: 1,
                          borderColor: unit === u ? colors.primary : colors.border,
                          backgroundColor: unit === u ? colors.primary + "22" : colors.accent,
                          borderRadius: 8,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            color: unit === u ? colors.primary : colors.mutedFg,
                            fontSize: 12,
                            fontWeight: "600",
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
                <Pressable
                  onPress={handleCreate}
                  disabled={saving || !title.trim() || !targetValue}
                  style={{
                    flex: 1,
                    backgroundColor:
                      saving || !title.trim() || !targetValue ? colors.muted : colors.primary,
                    borderRadius: 8,
                    height: 42,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>
                    {saving ? "Creating…" : "Create"}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowForm(false)}
                  style={{
                    backgroundColor: colors.accent,
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 8,
                    height: 42,
                    paddingHorizontal: 16,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: colors.mutedFg, fontWeight: "600", fontSize: 14 }}>
                    Cancel
                  </Text>
                </Pressable>
              </View>

              {type === "exercise_pr" && (
                <Text style={{ color: colors.dimFg, fontSize: 11 }}>
                  Tip: exercise-specific goals can be edited on the web app to pick an exercise.
                </Text>
              )}
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={colors.foreground} style={{ marginTop: 24 }} />
          ) : goals.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
              <Target size={40} color={colors.dimFg} />
              <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
                No goals yet
              </Text>
              <Text
                style={{
                  color: colors.mutedFg,
                  fontSize: 14,
                  textAlign: "center",
                  lineHeight: 20,
                }}
              >
                Set a target to stay motivated.
              </Text>
            </View>
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <Text
                    style={{
                      color: colors.mutedFg,
                      fontSize: 11,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Active ({active.length})
                  </Text>
                  {active.map((goal) => {
                    const Icon = iconFor(goal.type);
                    return (
                      <View
                        key={goal.id}
                        style={{
                          backgroundColor: colors.card,
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: colors.border,
                          padding: 14,
                          gap: 10,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <View
                            style={{
                              width: 36,
                              height: 36,
                              borderRadius: 8,
                              backgroundColor: colors.primary + "22",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon size={16} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                color: colors.foreground,
                                fontWeight: "600",
                                fontSize: 15,
                              }}
                              numberOfLines={1}
                            >
                              {goal.title}
                            </Text>
                            {goal.targetDate && (
                              <Text style={{ color: colors.dimFg, fontSize: 11, marginTop: 2 }}>
                                by {new Date(goal.targetDate).toLocaleDateString()}
                              </Text>
                            )}
                          </View>
                          <Pressable
                            onPress={() => handleDelete(goal.id, goal.title)}
                            hitSlop={8}
                            disabled={savingId === goal.id}
                          >
                            {savingId === goal.id ? (
                              <ActivityIndicator size="small" color={colors.mutedFg} />
                            ) : (
                              <Trash2 size={16} color={colors.dimFg} />
                            )}
                          </Pressable>
                        </View>

                        {/* Progress */}
                        <View>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              marginBottom: 6,
                            }}
                          >
                            <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                              {Number(goal.currentValue).toLocaleString(undefined, {
                                maximumFractionDigits: 1,
                              })}{" "}
                              {goal.unit}
                            </Text>
                            <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "600" }}>
                              {Number(goal.targetValue).toLocaleString(undefined, {
                                maximumFractionDigits: 1,
                              })}{" "}
                              {goal.unit}
                            </Text>
                          </View>
                          <View
                            style={{
                              height: 8,
                              backgroundColor: colors.accent,
                              borderRadius: 4,
                              overflow: "hidden",
                            }}
                          >
                            <View
                              style={{
                                height: "100%",
                                width: `${goal.progressPct}%`,
                                backgroundColor: goal.isComplete ? colors.success : colors.primary,
                              }}
                            />
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              marginTop: 8,
                              alignItems: "center",
                            }}
                          >
                            <View
                              style={{
                                backgroundColor: goal.isComplete
                                  ? colors.success + "22"
                                  : colors.accent,
                                borderRadius: 4,
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderWidth: 1,
                                borderColor: goal.isComplete ? colors.success : colors.border,
                              }}
                            >
                              <Text
                                style={{
                                  color: goal.isComplete ? colors.success : colors.mutedFg,
                                  fontSize: 11,
                                  fontWeight: "700",
                                }}
                              >
                                {goal.progressPct}%
                              </Text>
                            </View>
                            {goal.isComplete && (
                              <Pressable
                                onPress={() => handleMarkComplete(goal.id)}
                                disabled={savingId === goal.id}
                                style={{
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <Check size={14} color={colors.success} />
                                <Text
                                  style={{
                                    color: colors.success,
                                    fontSize: 12,
                                    fontWeight: "600",
                                  }}
                                >
                                  Mark complete
                                </Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </>
              )}

              {completed.length > 0 && (
                <>
                  <Text
                    style={{
                      color: colors.mutedFg,
                      fontSize: 11,
                      fontWeight: "600",
                      textTransform: "uppercase",
                      letterSpacing: 0.4,
                    }}
                  >
                    Completed ({completed.length})
                  </Text>
                  {completed.map((goal) => (
                    <View
                      key={goal.id}
                      style={{
                        backgroundColor: colors.card,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 12,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <Trophy size={16} color={colors.gold} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: colors.foreground,
                            fontSize: 14,
                            fontWeight: "500",
                          }}
                          numberOfLines={1}
                        >
                          {goal.title}
                        </Text>
                        <Text style={{ color: colors.dimFg, fontSize: 11, marginTop: 2 }}>
                          {Number(goal.targetValue)} {goal.unit}
                          {goal.completedAt &&
                            ` · completed ${new Date(goal.completedAt).toLocaleDateString()}`}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleDelete(goal.id, goal.title)}
                        hitSlop={8}
                      >
                        <Trash2 size={15} color={colors.dimFg} />
                      </Pressable>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
