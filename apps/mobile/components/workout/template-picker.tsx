import { useRef, useEffect, useState } from "react";
import { Alert, Text, Pressable, View, FlatList, ActivityIndicator } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { usePowerSync } from "@powersync/react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { Play, FileText } from "lucide-react-native";
import { useTemplates, type TemplateRow } from "@zor/sync";
import { useAuth } from "@/lib/auth";
import {
  startEmptyWorkoutAtomic,
  startWorkoutFromTemplateAtomic,
  DuplicateActiveWorkoutError,
} from "@/lib/workout-start";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function TemplatePicker({ open, onClose }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const db = usePowerSync();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data: templates } = useTemplates();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [open]);

  async function handleDuplicate(
    retryFn: (discardExisting: boolean) => Promise<void>,
    workoutName: string,
  ) {
    Alert.alert(
      "Active Workout",
      `You have "${workoutName}" in progress. Discard it and start a new one?`,
      [
        { text: "Keep Active", style: "cancel" },
        {
          text: "Discard & Start New",
          style: "destructive",
          onPress: () => retryFn(true),
        },
      ],
    );
  }

  async function createEmptyWorkout(discardExisting = false) {
    if (busy) return;
    setBusy(true);
    try {
      const { workoutId } = await startEmptyWorkoutAtomic(db as any, user!.id, {
        discardExisting,
      });
      onClose();
      navigation.navigate("WorkoutActive", { workoutId });
    } catch (err) {
      if (err instanceof DuplicateActiveWorkoutError) {
        handleDuplicate(createEmptyWorkout, err.existingWorkoutId);
      }
    } finally {
      setBusy(false);
    }
  }

  async function createFromTemplate(template: TemplateRow, discardExisting = false) {
    if (busy) return;
    setBusy(true);
    try {
      const { workoutId } = await startWorkoutFromTemplateAtomic(
        db as any,
        user!.id,
        template.id,
        { discardExisting },
      );
      onClose();
      navigation.navigate("WorkoutActive", { workoutId });
    } catch (err) {
      if (err instanceof DuplicateActiveWorkoutError) {
        handleDuplicate(
          (discard) => createFromTemplate(template, discard),
          err.existingWorkoutId,
        );
      }
    } finally {
      setBusy(false);
    }
  }

  const hasTemplates = templates.length > 0;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={["50%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "hsl(223, 47%, 11%)" }}
      handleIndicatorStyle={{ backgroundColor: "hsl(215, 20%, 65%)" }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: 24, paddingVertical: 16, flex: 1 }}
      >
        <Text
          style={{
            fontSize: 18,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
            marginBottom: 16,
          }}
        >
          Start Workout
        </Text>

        <Pressable
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            borderRadius: 12,
            backgroundColor: "hsl(210, 40%, 98%)",
            padding: 16,
            opacity: busy ? 0.6 : 1,
          }}
          onPress={() => createEmptyWorkout()}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator size="small" color="hsl(222.2, 47.4%, 11.2%)" />
          ) : (
            <Play size={20} color="hsl(222.2, 47.4%, 11.2%)" />
          )}
          <Text
            style={{
              color: "hsl(222.2, 47.4%, 11.2%)",
              fontWeight: "600",
              fontSize: 16,
            }}
          >
            Empty Workout
          </Text>
        </Pressable>

        {hasTemplates && (
          <>
            <View
              style={{
                height: 1,
                backgroundColor: "hsl(216, 34%, 17%)",
                marginVertical: 16,
              }}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "500",
                color: "hsl(215, 20%, 65%)",
                marginBottom: 8,
              }}
            >
              From Template
            </Text>
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    borderRadius: 12,
                    backgroundColor: "hsl(216, 34%, 17%)",
                    padding: 16,
                    marginBottom: 8,
                    opacity: busy ? 0.6 : 1,
                  }}
                  onPress={() => createFromTemplate(item)}
                  disabled={busy}
                >
                  <FileText size={20} color="hsl(213, 31%, 91%)" />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: "hsl(213, 31%, 91%)",
                        fontWeight: "500",
                      }}
                    >
                      {item.name}
                    </Text>
                    {item.exercise_count != null && (
                      <Text
                        style={{
                          color: "hsl(215, 20%, 65%)",
                          fontSize: 12,
                          marginTop: 2,
                        }}
                      >
                        {item.exercise_count} exercise
                        {item.exercise_count !== 1 ? "s" : ""}
                      </Text>
                    )}
                  </View>
                </Pressable>
              )}
            />
          </>
        )}
      </BottomSheetView>
    </BottomSheet>
  );
}
