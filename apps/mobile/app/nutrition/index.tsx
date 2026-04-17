import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
import { Trash2, Utensils } from "lucide-react-native";
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
  error: "#EF4444",
};

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

function todayDate(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type DailySummary = Awaited<ReturnType<typeof trpc.nutrition.dailySummary.query>>;
type MealList = Awaited<ReturnType<typeof trpc.nutrition.listMeals.query>>;

export default function NutritionScreen() {
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [meals, setMeals] = useState<MealList["meals"]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [name, setName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [notes, setNotes] = useState("");
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
      // keep stale data
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
        ...(notes.trim() !== "" && { notes: notes.trim() }),
      });
      setName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setNotes("");
      await load();
    } catch {
      Alert.alert("Error", "Failed to log meal. Please try again.");
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

  const grouped = MEAL_TYPES.map((t) => ({
    ...t,
    meals: meals.filter((m) => m.mealType === t.value),
  })).filter((g) => g.meals.length > 0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

          {/* Macro Summary */}
          {summary && summary.mealCount > 0 && (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
              }}
            >
              <Text style={{ color: colors.mutedFg, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 12 }}>
                Today's Macros
              </Text>
              <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
                {[
                  { label: "kcal", value: String(summary.totalCalories) },
                  { label: "protein", value: `${Number(summary.totalProteinG).toFixed(1)}g` },
                  { label: "carbs", value: `${Number(summary.totalCarbsG).toFixed(1)}g` },
                  { label: "fat", value: `${Number(summary.totalFatG).toFixed(1)}g` },
                ].map(({ label, value }) => (
                  <View key={label} style={{ alignItems: "center" }}>
                    <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>{value}</Text>
                    <Text style={{ color: colors.mutedFg, fontSize: 11, marginTop: 2 }}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Log Meal Form */}
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
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
              <Utensils size={16} color={colors.mutedFg} />
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Log Meal</Text>
            </View>

            {/* Meal type picker */}
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {MEAL_TYPES.map((t) => (
                <Pressable
                  key={t.value}
                  onPress={() => setMealType(t.value)}
                  style={{
                    backgroundColor: mealType === t.value ? colors.primary : colors.accent,
                    borderWidth: 1,
                    borderColor: mealType === t.value ? colors.primary : colors.border,
                    borderRadius: 20,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}
                >
                  <Text style={{ color: mealType === t.value ? "#fff" : colors.mutedFg, fontSize: 13, fontWeight: "500" }}>
                    {t.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Food name */}
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
              placeholder="Food name *"
              placeholderTextColor={colors.dimFg}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            {/* Macros row */}
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[
                { label: "Calories", value: calories, setter: setCalories, placeholder: "kcal" },
                { label: "Protein (g)", value: protein, setter: setProtein, placeholder: "g" },
                { label: "Carbs (g)", value: carbs, setter: setCarbs, placeholder: "g" },
                { label: "Fat (g)", value: fat, setter: setFat, placeholder: "g" },
              ].map(({ label, value, setter, placeholder }) => (
                <View key={label} style={{ flex: 1, gap: 4 }}>
                  <Text style={{ color: colors.dimFg, fontSize: 10, fontWeight: "600", textTransform: "uppercase" }}>{label}</Text>
                  <TextInput
                    style={{
                      backgroundColor: colors.accent,
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 8,
                      height: 40,
                      paddingHorizontal: 8,
                      color: colors.foreground,
                      fontSize: 14,
                      textAlign: "center",
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={colors.dimFg}
                    value={value}
                    onChangeText={setter}
                    keyboardType="decimal-pad"
                  />
                </View>
              ))}
            </View>

            {/* Notes */}
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
              placeholder="Notes (optional)"
              placeholderTextColor={colors.dimFg}
              value={notes}
              onChangeText={setNotes}
            />

            <Pressable
              onPress={handleLogMeal}
              disabled={saving || !name.trim()}
              style={{
                backgroundColor: saving || !name.trim() ? colors.muted : colors.primary,
                borderRadius: 8,
                height: 44,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>
                {saving ? "Saving…" : "Log Meal"}
              </Text>
            </Pressable>
          </View>

          {/* Today's meals */}
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Today's Meals</Text>

          {loading ? (
            <ActivityIndicator color={colors.foreground} />
          ) : grouped.length === 0 ? (
            <Text style={{ color: colors.mutedFg, textAlign: "center", paddingVertical: 24, fontSize: 14 }}>
              No meals logged today.
            </Text>
          ) : (
            grouped.map((group) => (
              <View key={group.value} style={{ gap: 8 }}>
                <Text style={{ color: colors.mutedFg, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
                  {group.label}
                </Text>
                {group.meals.map((meal) => (
                  <View
                    key={meal.id}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 12,
                      flexDirection: "row",
                      alignItems: "flex-start",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }} numberOfLines={1}>
                        {meal.name}
                      </Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                        {meal.calories != null && (
                          <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{meal.calories} kcal</Text>
                        )}
                        {meal.proteinG != null && (
                          <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{Number(meal.proteinG).toFixed(1)}g protein</Text>
                        )}
                        {meal.carbsG != null && (
                          <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{Number(meal.carbsG).toFixed(1)}g carbs</Text>
                        )}
                        {meal.fatG != null && (
                          <Text style={{ color: colors.mutedFg, fontSize: 12 }}>{Number(meal.fatG).toFixed(1)}g fat</Text>
                        )}
                      </View>
                      {meal.notes && (
                        <Text style={{ color: colors.dimFg, fontSize: 12, marginTop: 3, fontStyle: "italic" }}>
                          {meal.notes}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleDelete(meal.id)}
                      disabled={deleting === meal.id}
                      hitSlop={8}
                    >
                      {deleting === meal.id ? (
                        <ActivityIndicator size="small" color={colors.mutedFg} />
                      ) : (
                        <Trash2 size={16} color={colors.dimFg} />
                      )}
                    </Pressable>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
