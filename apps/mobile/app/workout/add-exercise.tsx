import React, { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePowerSync } from "@powersync/react";
import { useExercises } from "@ironpulse/sync";
import { X } from "lucide-react-native";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  border: "hsl(216, 34%, 17%)",
};

export default function AddExerciseScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const router = useRouter();
  const db = usePowerSync();

  const [search, setSearch] = useState("");
  const { data: exercises } = useExercises({ search: search || undefined });

  const handleSelect = useCallback(
    async (exerciseId: string) => {
      // Get next order value
      const countResult = await db.execute(
        "SELECT COUNT(*) as cnt FROM workout_exercises WHERE workout_id = ?",
        [workoutId]
      );
      const nextOrder = ((countResult.rows?._array?.[0]?.cnt as number) ?? 0) + 1;

      // Insert workout_exercise
      const weId =
        crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      await db.execute(
        `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes)
         VALUES (?, ?, ?, ?, NULL)`,
        [weId, workoutId, exerciseId, nextOrder]
      );

      // Insert first empty set
      const setId =
        crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      await db.execute(
        `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, weight_kg, reps, rpe, completed)
         VALUES (?, ?, 1, NULL, NULL, NULL, 0)`,
        [setId, weId]
      );

      router.back();
    },
    [db, workoutId, router]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header with close button */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.muted,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <X size={20} color={colors.foreground} />
        </Pressable>

        <Text
          style={{
            color: colors.foreground,
            fontSize: 18,
            fontWeight: "700",
            flex: 1,
          }}
        >
          Add Exercise
        </Text>
      </View>

      {/* Search input */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <TextInput
          autoFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={colors.mutedFg}
          style={{
            backgroundColor: colors.muted,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            color: colors.foreground,
            fontSize: 16,
          }}
        />
      </View>

      {/* Exercise list */}
      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 16 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleSelect(item.id)}
            style={{
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                color: colors.foreground,
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {item.name}
            </Text>
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 4,
              }}
            >
              {item.category ? (
                <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                  {item.category}
                </Text>
              ) : null}
              {item.primary_muscles ? (
                <Text style={{ color: colors.mutedFg, fontSize: 13 }}>
                  {item.primary_muscles}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <Text style={{ color: colors.mutedFg, fontSize: 15 }}>
              {search ? "No exercises found" : "Type to search exercises"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
