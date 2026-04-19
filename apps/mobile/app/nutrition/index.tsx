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
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import { ChevronDown, ChevronUp, Coffee, Croissant, Moon, Plus, Sun, Trash2, Utensils } from "lucide-react-native";

import { trpc } from "@/lib/trpc";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { BigNum, Button, TopBar, UppercaseLabel } from "@/components/ui";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: {
  value: MealType;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
}[] = [
  { value: "breakfast", label: "Breakfast", icon: Sun },
  { value: "lunch", label: "Lunch", icon: Utensils },
  { value: "snack", label: "Snack", icon: Croissant },
  { value: "dinner", label: "Dinner", icon: Moon },
];

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type DailySummary = Awaited<ReturnType<typeof trpc.nutrition.dailySummary.query>>;
type MealList = Awaited<ReturnType<typeof trpc.nutrition.listMeals.query>>;

// Target assumptions — the user-editable version lives under settings.
// These are the denominators the rings track.
const DEFAULTS = { calories: 2600, protein: 200, carbs: 260, fat: 80 };

export default function NutritionScreen() {
  const navigation = useNavigation();
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [meals, setMeals] = useState<MealList["meals"]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // Form state
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const [sum, list] = await Promise.all([
        trpc.nutrition.dailySummary.query({ date: todayDate() }),
        trpc.nutrition.listMeals.query({ date: todayDate() }),
      ]);
      setSummary(sum);
      setMeals(list.meals);
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogMeal() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await trpc.nutrition.logMeal.mutate({
        date: todayDate(),
        mealType,
        name: name.trim(),
        ...(calories !== "" && { calories: parseInt(calories, 10) }),
        ...(protein !== "" && { proteinG: parseFloat(protein) }),
        ...(carbs !== "" && { carbsG: parseFloat(carbs) }),
        ...(fat !== "" && { fatG: parseFloat(fat) }),
      });
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setFormOpen(false);
      await load();
    } catch {
      Alert.alert("Error", "Failed to log meal.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await trpc.nutrition.deleteMeal.mutate({ id });
      await load();
    } catch {
      Alert.alert("Error", "Failed to delete meal.");
    } finally {
      setDeleting(null);
    }
  }

  const totals = {
    calories: summary?.totalCalories ?? 0,
    protein: Number(summary?.totalProteinG ?? 0),
    carbs: Number(summary?.totalCarbsG ?? 0),
    fat: Number(summary?.totalFatG ?? 0),
  };
  const caloriesRemaining = Math.max(0, DEFAULTS.calories - totals.calories);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 40 }}>
          <TopBar
            title="Nutrition"
            onBack={() => navigation.goBack()}
            right={
              <Pressable
                onPress={() => setFormOpen((v) => !v)}
                hitSlop={6}
                accessibilityLabel={formOpen ? "Close meal form" : "Log meal"}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: formOpen ? colors.bg2 : colors.blue,
                  borderWidth: 1,
                  borderColor: formOpen ? colors.line : colors.blue,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Plus
                  size={16}
                  color={formOpen ? colors.text2 : colors.white}
                  style={{ transform: [{ rotate: formOpen ? "45deg" : "0deg" }] }}
                />
              </Pressable>
            }
          />

          {/* Calorie ring hero */}
          <View
            style={{
              backgroundColor: colors.bg1,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.lineSoft,
              paddingVertical: 16,
              paddingHorizontal: 14,
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            <UppercaseLabel style={{ marginBottom: 10 }}>
              Today · {totals.calories.toLocaleString()} / {DEFAULTS.calories.toLocaleString()} cal
            </UppercaseLabel>
            <CalorieRing
              calories={totals.calories}
              protein={totals.protein}
              carbs={totals.carbs}
              remaining={caloriesRemaining}
            />
            <View style={{ flexDirection: "row", gap: 6, marginTop: 16, alignSelf: "stretch" }}>
              <MacroBar label="Protein" color={colors.blue} value={totals.protein} target={DEFAULTS.protein} />
              <MacroBar label="Carbs" color={colors.amber} value={totals.carbs} target={DEFAULTS.carbs} />
              <MacroBar label="Fat" color={colors.green} value={totals.fat} target={DEFAULTS.fat} />
            </View>
          </View>

          {/* Log form */}
          {formOpen ? (
            <View
              style={{
                backgroundColor: colors.bg1,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                padding: 14,
                gap: 10,
                marginBottom: 10,
              }}
            >
              <UppercaseLabel>Log meal</UppercaseLabel>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {MEAL_TYPES.map((t) => {
                  const active = mealType === t.value;
                  return (
                    <Pressable
                      key={t.value}
                      onPress={() => setMealType(t.value)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        borderRadius: radii.chip,
                        backgroundColor: active ? colors.blue : colors.bg2,
                        borderWidth: 1,
                        borderColor: active ? "transparent" : colors.line,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 12,
                          color: active ? colors.white : colors.text2,
                          fontFamily: fonts.bodyMedium,
                        }}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                placeholder="Food name"
                placeholderTextColor={colors.text4}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                style={textInputStyle}
              />

              <View style={{ flexDirection: "row", gap: 6 }}>
                {[
                  { v: calories, set: setCalories, ph: "kcal" },
                  { v: protein, set: setProtein, ph: "P g" },
                  { v: carbs, set: setCarbs, ph: "C g" },
                  { v: fat, set: setFat, ph: "F g" },
                ].map((m, i) => (
                  <TextInput
                    key={i}
                    placeholder={m.ph}
                    placeholderTextColor={colors.text4}
                    keyboardType="decimal-pad"
                    value={m.v}
                    onChangeText={m.set}
                    style={[textInputStyle, { flex: 1, textAlign: "center" as const }]}
                  />
                ))}
              </View>

              <Button variant="primary" onPress={handleLogMeal} disabled={saving || !name.trim()}>
                {saving ? "Saving…" : "Log meal"}
              </Button>
            </View>
          ) : null}

          {/* Meal list */}
          {loading ? (
            <ActivityIndicator color={colors.text3} style={{ marginVertical: 24 }} />
          ) : (
            <View
              style={{
                backgroundColor: colors.bg1,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                borderRadius: radii.rowList,
                overflow: "hidden",
              }}
            >
              {MEAL_TYPES.map((t, i) => {
                const IconCmp = t.icon;
                const entries = meals.filter((m) => m.mealType === t.value);
                const total = entries.reduce((s, m) => s + (m.calories ?? 0), 0);
                const foods = entries.length
                  ? entries.map((m) => m.name).join(" · ")
                  : "";
                const empty = entries.length === 0;
                const firstTime = entries[0]?.createdAt;
                const timeLabel = firstTime
                  ? new Date(String(firstTime)).toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—";

                return (
                  <View
                    key={t.value}
                    style={{
                      borderTopWidth: i === 0 ? 0 : 1,
                      borderTopColor: colors.lineSoft,
                      padding: 14,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <View
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        backgroundColor: empty ? colors.bg2 : colors.greenSoft,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconCmp size={14} color={empty ? colors.text4 : colors.green} />
                    </View>

                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                        <Text
                          style={{
                            fontSize: 13,
                            color: colors.text,
                            fontFamily: fonts.bodyMedium,
                          }}
                        >
                          {t.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10,
                            color: colors.text4,
                            fontFamily: fonts.monoRegular,
                          }}
                        >
                          {timeLabel}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          color: empty ? colors.text4 : colors.text3,
                          marginTop: 2,
                          fontFamily: fonts.bodyRegular,
                        }}
                      >
                        {empty ? "Add meal" : foods}
                      </Text>
                    </View>

                    {empty ? (
                      <Pressable
                        onPress={() => {
                          setMealType(t.value);
                          setFormOpen(true);
                        }}
                        hitSlop={4}
                      >
                        <Plus size={16} color={colors.text3} />
                      </Pressable>
                    ) : (
                      <View style={{ alignItems: "flex-end", gap: 4 }}>
                        <BigNum size={14}>{total}</BigNum>
                        <Text style={{ fontSize: 9, color: colors.text4, fontFamily: fonts.monoRegular }}>
                          kcal
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Per-entry meal list with delete */}
          {meals.length > 0 ? (
            <View style={{ marginTop: 14 }}>
              <UppercaseLabel style={{ marginBottom: 6 }}>Entries</UppercaseLabel>
              {meals.map((m) => (
                <View
                  key={m.id}
                  style={{
                    backgroundColor: colors.bg1,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: colors.lineSoft,
                    padding: 10,
                    marginBottom: 6,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 12.5, color: colors.text, fontFamily: fonts.bodyMedium }}
                    >
                      {m.name}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.text4, marginTop: 1, fontFamily: fonts.monoRegular }}>
                      {[
                        m.calories != null ? `${m.calories} kcal` : null,
                        m.proteinG != null ? `${Number(m.proteinG).toFixed(0)}P` : null,
                        m.carbsG != null ? `${Number(m.carbsG).toFixed(0)}C` : null,
                        m.fatG != null ? `${Number(m.fatG).toFixed(0)}F` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDelete(m.id)} disabled={deleting === m.id} hitSlop={6}>
                    {deleting === m.id ? (
                      <ActivityIndicator size="small" color={colors.text3} />
                    ) : (
                      <Trash2 size={14} color={colors.text4} />
                    )}
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const textInputStyle = {
  backgroundColor: colors.bg2,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radii.button,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: colors.text,
  fontSize: 13,
  fontFamily: fonts.bodyRegular,
};

/** Triple concentric rings: outer = calories (green), middle = protein (blue),
 *  inner = carbs (amber). Center shows remaining kcal. */
function CalorieRing({
  calories,
  protein,
  carbs,
  remaining,
}: {
  calories: number;
  protein: number;
  carbs: number;
  remaining: number;
}) {
  const size = 140;
  const c = size / 2;
  const make = (r: number, v: number, max: number) => {
    const circ = 2 * Math.PI * r;
    const pct = Math.max(0, Math.min(1, max > 0 ? v / max : 0));
    return { r, circ, offset: circ * (1 - pct) };
  };
  const outer = make(58, calories, DEFAULTS.calories);
  const middle = make(46, protein, DEFAULTS.protein);
  const inner = make(36, carbs, DEFAULTS.carbs);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}>
        <Circle cx={c} cy={c} r={outer.r} stroke={colors.bg3} strokeWidth={6} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={outer.r}
          stroke={colors.green}
          strokeWidth={6}
          fill="none"
          strokeDasharray={outer.circ}
          strokeDashoffset={outer.offset}
          strokeLinecap="round"
        />
        <Circle cx={c} cy={c} r={middle.r} stroke={colors.bg3} strokeWidth={3} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={middle.r}
          stroke={colors.blue}
          strokeWidth={3}
          fill="none"
          strokeDasharray={middle.circ}
          strokeDashoffset={middle.offset}
          strokeLinecap="round"
        />
        <Circle cx={c} cy={c} r={inner.r} stroke={colors.bg3} strokeWidth={3} fill="none" />
        <Circle
          cx={c}
          cy={c}
          r={inner.r}
          stroke={colors.amber}
          strokeWidth={3}
          fill="none"
          strokeDasharray={inner.circ}
          strokeDashoffset={inner.offset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <UppercaseLabel>Remaining</UppercaseLabel>
        <BigNum size={26}>{remaining.toLocaleString()}</BigNum>
        <Text style={{ fontSize: 10, color: colors.text4, fontFamily: fonts.monoRegular }}>cal</Text>
      </View>
    </View>
  );
}

function MacroBar({
  label,
  value,
  target,
  color,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
}) {
  const pct = Math.max(0, Math.min(1, target > 0 ? value / target : 0));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 10, color: colors.text3, fontFamily: fonts.bodyMedium }}>{label}</Text>
        <Text style={{ fontSize: 10, color: colors.text2, fontFamily: fonts.monoRegular }}>
          {value.toFixed(0)}
          <Text style={{ color: colors.text4 }}>/{target}g</Text>
        </Text>
      </View>
      <View style={{ height: 3, backgroundColor: colors.bg3, borderRadius: 2, marginTop: 4 }}>
        <View
          style={{
            width: `${pct * 100}%`,
            height: 3,
            backgroundColor: color,
            borderRadius: 2,
          }}
        />
      </View>
    </View>
  );
}
