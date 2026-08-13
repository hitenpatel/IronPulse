/**
 * ExerciseMultiPicker — tab-switched multi-select exercise picker.
 *
 * Views: Recent | Favorites | All
 * Features:
 *   - Search + muscle-group + equipment filter chips
 *   - Persistent selection across view/filter/search changes
 *   - dedupeSelection semantics: second tap in same session = deselect
 *   - "Add N Exercises" sticky button commits the whole batch
 *   - Safe-area header
 *   - Loading / offline / no-results / error states
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, Check, Filter } from "lucide-react-native";

import type { ExerciseRow } from "@zor/sync";
import { filterExercises, dedupeSelection, activeFilterCount } from "../../lib/exercise-picker-state";

// ── Colour tokens (mirroring add-exercise.tsx until theme is shared) ────────
const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  muted: "hsl(223, 47%, 11%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  accent: "hsl(216, 34%, 17%)",
  border: "hsl(216, 34%, 17%)",
  blue: "hsl(217, 91%, 60%)",
  danger: "hsl(0, 72%, 51%)",
};

// ── Types ────────────────────────────────────────────────────────────────────

export type PickerView = "recent" | "favorites" | "all";

export interface ExerciseMultiPickerProps {
  // Data from the parent (already resolved via PowerSync hooks)
  allExercises: ExerciseRow[];
  recentExercises: ExerciseRow[];
  favoriteExercises: ExerciseRow[];

  // Loading / error flags for each view
  isLoadingAll?: boolean;
  isLoadingRecent?: boolean;
  errorAll?: boolean;
  isOffline?: boolean;

  // Callbacks
  onAdd(selectedIds: string[]): void;
  onClose(): void;

  // Optional: retry callback
  onRetry?(): void;
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

interface TabBarProps {
  active: PickerView;
  onPress(view: PickerView): void;
}

function TabBar({ active, onPress }: TabBarProps) {
  const tabs: { key: PickerView; label: string }[] = [
    { key: "recent", label: "Recent" },
    { key: "favorites", label: "Favorites" },
    { key: "all", label: "All" },
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: 16,
        marginBottom: 8,
        gap: 8,
      }}
    >
      {tabs.map(({ key, label }) => (
        <Pressable
          key={key}
          testID={`tab-${key}`}
          onPress={() => onPress(key)}
          style={{
            paddingVertical: 6,
            paddingHorizontal: 14,
            borderRadius: 20,
            backgroundColor: active === key ? colors.blue : colors.muted,
          }}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === key }}
        >
          <Text
            style={{
              color: active === key ? colors.primary : colors.mutedFg,
              fontSize: 14,
              fontWeight: active === key ? "600" : "400",
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

interface FilterChipProps {
  label: string;
  active: boolean;
  onPress(): void;
}

function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={`filter-chip-${label}`}
      style={{
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: active ? colors.blue : colors.border,
        backgroundColor: active ? `${colors.blue}22` : "transparent",
        marginRight: 6,
      }}
    >
      <Text style={{ color: active ? colors.blue : colors.mutedFg, fontSize: 12 }}>
        {label}
      </Text>
    </Pressable>
  );
}

interface ExerciseRowItemProps {
  exercise: ExerciseRow;
  selected: boolean;
  onPress(): void;
}

function ExerciseRowItem({ exercise, selected, onPress }: ExerciseRowItemProps) {
  return (
    <Pressable
      testID={`exercise-option-${exercise.id}`}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={exercise.name}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: selected ? `${colors.blue}18` : "transparent",
      }}
    >
      {/* Checkbox */}
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 1.5,
          borderColor: selected ? colors.blue : colors.mutedFg,
          backgroundColor: selected ? colors.blue : "transparent",
          justifyContent: "center",
          alignItems: "center",
          marginRight: 12,
        }}
      >
        {selected && <Check size={13} color={colors.primary} strokeWidth={3} />}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>
          {exercise.name}
        </Text>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
          {exercise.primary_muscles ? (
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
              {exercise.primary_muscles}
            </Text>
          ) : null}
          {exercise.equipment ? (
            <Text style={{ color: colors.mutedFg, fontSize: 12 }}>
              · {exercise.equipment}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

// ── Hardcoded muscle groups and equipment for filter chips ─────────────────
const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core", "Glutes"];
const EQUIPMENT_TYPES = ["Barbell", "Dumbbell", "Machine", "Bodyweight", "Cable", "Kettlebell"];

// ── Main component ───────────────────────────────────────────────────────────

export function ExerciseMultiPicker({
  allExercises,
  recentExercises,
  favoriteExercises,
  isLoadingAll,
  isLoadingRecent,
  errorAll,
  isOffline,
  onAdd,
  onClose,
  onRetry,
}: ExerciseMultiPickerProps) {
  const insets = useSafeAreaInsets();

  const [activeView, setActiveView] = useState<PickerView>("recent");
  const [search, setSearch] = useState("");
  const [muscleFilter, setMuscleFilter] = useState("");
  const [equipmentFilter, setEquipmentFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const handleToggle = useCallback((id: string) => {
    setSelectedIds((prev) => dedupeSelection(prev, id));
  }, []);

  // Determine base list for the active view
  const baseList = useMemo((): ExerciseRow[] => {
    switch (activeView) {
      case "recent": return recentExercises;
      case "favorites": return favoriteExercises;
      case "all": return allExercises;
    }
  }, [activeView, recentExercises, favoriteExercises, allExercises]);

  const filtered = useMemo(
    () => filterExercises(baseList, { search, muscle: muscleFilter, equipment: equipmentFilter }),
    [baseList, search, muscleFilter, equipmentFilter],
  );

  const filterCount = activeFilterCount({ muscle: muscleFilter, equipment: equipmentFilter });
  const selectionCount = selectedIds.length;

  const isLoading = activeView === "all" ? isLoadingAll : activeView === "recent" ? isLoadingRecent : false;
  const hasError = activeView === "all" && errorAll;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Safe-area header */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Pressable
          testID="picker-close"
          onPress={onClose}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.muted,
            justifyContent: "center",
            alignItems: "center",
          }}
          accessibilityLabel="Close picker"
        >
          <X size={20} color={colors.foreground} />
        </Pressable>

        <Text
          style={{ color: colors.foreground, fontSize: 18, fontWeight: "700", flex: 1 }}
        >
          Add Exercises
          {selectionCount > 0 ? ` (${selectionCount})` : ""}
        </Text>

        {/* Filter toggle */}
        <Pressable
          testID="filter-toggle"
          onPress={() => setShowFilters((v) => !v)}
          hitSlop={8}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: filterCount > 0 ? `${colors.blue}33` : colors.muted,
            justifyContent: "center",
            alignItems: "center",
          }}
          accessibilityLabel={`Filters${filterCount > 0 ? ` (${filterCount} active)` : ""}`}
        >
          <Filter size={18} color={filterCount > 0 ? colors.blue : colors.foreground} />
          {filterCount > 0 && (
            <View
              style={{
                position: "absolute",
                top: 4,
                right: 4,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.blue,
              }}
            />
          )}
        </Pressable>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
        <TextInput
          testID="search-input"
          autoFocus
          value={search}
          onChangeText={setSearch}
          placeholder="Search exercises..."
          placeholderTextColor={colors.mutedFg}
          style={{
            backgroundColor: colors.muted,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 10,
            color: colors.foreground,
            fontSize: 15,
          }}
        />
      </View>

      {/* Filter chips (expandable) */}
      {showFilters && (
        <View style={{ marginBottom: 8 }}>
          <Text style={{ color: colors.mutedFg, fontSize: 11, paddingHorizontal: 16, marginBottom: 4 }}>
            MUSCLE GROUP
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {MUSCLE_GROUPS.map((m) => (
              <FilterChip
                key={m}
                label={m}
                active={muscleFilter === m}
                onPress={() => setMuscleFilter(muscleFilter === m ? "" : m)}
              />
            ))}
          </ScrollView>

          <Text style={{ color: colors.mutedFg, fontSize: 11, paddingHorizontal: 16, marginBottom: 4, marginTop: 8 }}>
            EQUIPMENT
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {EQUIPMENT_TYPES.map((e) => (
              <FilterChip
                key={e}
                label={e}
                active={equipmentFilter === e}
                onPress={() => setEquipmentFilter(equipmentFilter === e ? "" : e)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Tab bar */}
      <TabBar active={activeView} onPress={setActiveView} />

      {/* List / states */}
      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }} testID="loading-indicator">
          <ActivityIndicator color={colors.blue} />
          <Text style={{ color: colors.mutedFg, marginTop: 8, fontSize: 14 }}>Loading exercises…</Text>
        </View>
      ) : hasError ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 24 }} testID="error-state">
          <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Failed to load exercises
          </Text>
          <Text style={{ color: colors.mutedFg, fontSize: 14, textAlign: "center", marginBottom: 16 }}>
            Check your connection and try again.
          </Text>
          {onRetry && (
            <Pressable
              testID="retry-button"
              onPress={onRetry}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 20,
                borderRadius: 8,
                backgroundColor: colors.blue,
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>Retry</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <>
          {isOffline && (
            <View
              testID="offline-banner"
              style={{
                marginHorizontal: 16,
                marginBottom: 6,
                paddingVertical: 6,
                paddingHorizontal: 12,
                backgroundColor: `${colors.danger}22`,
                borderRadius: 6,
              }}
            >
              <Text style={{ color: colors.danger, fontSize: 12 }}>
                Offline — showing cached exercises
              </Text>
            </View>
          )}

          <ScrollView
            testID="exercise-list"
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
          >
            {filtered.length === 0 ? (
              <View
                testID="empty-state"
                style={{ paddingTop: 60, alignItems: "center", paddingHorizontal: 24 }}
              >
                <Text style={{ color: colors.mutedFg, fontSize: 15, textAlign: "center" }}>
                  {activeView === "recent" && !search
                    ? "No recent exercises yet"
                    : activeView === "favorites" && !search
                    ? "No favorites yet"
                    : "No exercises match your search"}
                </Text>
              </View>
            ) : (
              filtered.map((item) => (
                <ExerciseRowItem
                  key={item.id}
                  exercise={item}
                  selected={selectedIds.includes(item.id)}
                  onPress={() => handleToggle(item.id)}
                />
              ))
            )}
          </ScrollView>
        </>
      )}

      {/* Sticky Add button */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: insets.bottom + 12,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          testID="add-button"
          onPress={() => {
            if (selectionCount > 0) onAdd(selectedIds);
          }}
          disabled={selectionCount === 0}
          accessibilityLabel={
            selectionCount > 0 ? `Add ${selectionCount} exercise${selectionCount > 1 ? "s" : ""}` : "Select exercises to add"
          }
          style={{
            backgroundColor: selectionCount > 0 ? colors.blue : colors.muted,
            borderRadius: 12,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              color: selectionCount > 0 ? colors.primary : colors.mutedFg,
              fontSize: 16,
              fontWeight: "700",
            }}
          >
            {selectionCount > 0
              ? `Add ${selectionCount} Exercise${selectionCount > 1 ? "s" : ""}`
              : "Select Exercises"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
