import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import type { BottomSheetBackdropProps } from "@gorhom/bottom-sheet";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Dumbbell, Activity, Scale, ChevronRight, Zap } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, fonts, radii } from "@/lib/theme";
import * as Haptics from "@/lib/haptics";
import type { RootStackParamList } from "../../App";
import { useLatestIncompleteWorkout } from "@zor/sync";
import { usePowerSync } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import {
  startEmptyWorkoutAtomic,
  DuplicateActiveWorkoutError,
} from "@/lib/workout-start";

interface Props {
  open: boolean;
  onClose: () => void;
  onStartWorkout?: () => void;
  onLogCardio?: () => void;
}

type ActionKey = "workout" | "cardio" | "metrics";

// Soft, responsive spring — feels closer to native iOS sheets than gorhom's default.
const SHEET_SPRING = {
  damping: 22,
  stiffness: 240,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
} as const;

function ActionRow({
  icon: Icon,
  iconColor,
  label,
  onPress,
  index,
  primary,
}: {
  icon: typeof Dumbbell;
  iconColor: string;
  label: string;
  onPress: () => void;
  index: number;
  primary?: boolean;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInDown.delay(80 + index * 55).springify().damping(18).mass(0.9)}
      style={animatedStyle}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 16, stiffness: 320 });
          Haptics.selectionAsync();
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 14, stiffness: 260 });
        }}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 60,
          borderRadius: radii.card,
          backgroundColor: primary ? colors.green : colors.bg2,
          borderWidth: 1,
          borderColor: primary ? colors.green : colors.lineSoft,
          paddingHorizontal: 16,
          gap: 14,
        }}
      >
        <Icon size={24} color={primary ? colors.bg : iconColor} />
        <Text
          style={{
            flex: 1,
            color: primary ? colors.bg : colors.text,
            fontSize: 16,
            fontFamily: fonts.bodyMedium,
          }}
        >
          {label}
        </Text>
        <ChevronRight size={18} color={primary ? colors.bg : colors.text4} />
      </Pressable>
    </Animated.View>
  );
}

export function NewSessionSheet({ open, onClose, onStartWorkout, onLogCardio }: Props) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const db = usePowerSync();
  const { user } = useAuth();
  const { data: incompleteRows } = useLatestIncompleteWorkout();
  const [startingNew, setStartingNew] = useState(false);
  const inFlight = useRef(false);

  const activeRow = incompleteRows?.[0] ?? null;
  const activeWorkout = activeRow
    ? { id: activeRow.id, name: activeRow.name ?? "Active Workout" }
    : null;

  useEffect(() => {
    if (open) bottomSheetRef.current?.expand();
    else bottomSheetRef.current?.close();
  }, [open]);

  const renderBackdrop = useMemo(
    () => (props: BottomSheetBackdropProps) =>
      (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.55}
          pressBehavior="close"
          style={[props.style, { backgroundColor: "rgba(11,13,18,1)" }]}
        />
      ),
    [],
  );

  const handleContinue = () => {
    if (!activeWorkout) return;
    onClose();
    navigation.navigate("WorkoutActive", { workoutId: activeWorkout.id });
  };

  const handleStartNew = async () => {
    // Double-tap guard
    if (inFlight.current || startingNew) return;
    inFlight.current = true;
    setStartingNew(true);

    try {
      const { workoutId } = await startEmptyWorkoutAtomic(db as any, user?.id ?? "");
      onClose();
      navigation.navigate("WorkoutActive", { workoutId });
    } catch (err) {
      if (err instanceof DuplicateActiveWorkoutError) {
        Alert.alert(
          "Active Workout",
          "You already have an active workout. Discard it and start a new one?",
          [
            { text: "Keep Active", style: "cancel" },
            {
              text: "Start New",
              style: "destructive",
              onPress: async () => {
                try {
                  const { workoutId } = await startEmptyWorkoutAtomic(
                    db as any,
                    user?.id ?? "",
                    { discardExisting: true },
                  );
                  onClose();
                  navigation.navigate("WorkoutActive", { workoutId });
                } catch {
                  // ignore — user can retry
                }
              },
            },
          ],
        );
      }
    } finally {
      setStartingNew(false);
      inFlight.current = false;
    }
  };

  const handleAction = (key: ActionKey) => {
    if (key === "cardio") {
      onClose();
      onLogCardio?.();
    } else if (key === "metrics") {
      onClose();
      navigation.navigate("Settings" as never);
    }
  };

  const sheetHeight = activeWorkout ? "48%" : "38%";

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={[sheetHeight]}
      enablePanDownToClose
      animationConfigs={SHEET_SPRING}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.bg1,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.line2,
        width: 44,
        height: 4,
      }}
    >
      <BottomSheetView
        style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 10 }}
      >
        <Animated.View entering={FadeInUp.duration(280)}>
          <Text
            style={{
              color: colors.text3,
              fontSize: 12,
              fontFamily: fonts.bodySemi,
              textTransform: "uppercase",
              letterSpacing: 1.2,
              marginBottom: 8,
              paddingHorizontal: 4,
            }}
          >
            {activeWorkout ? "Your Session" : "New Session"}
          </Text>
        </Animated.View>
        <View style={{ gap: 10 }}>
          {/* Primary: Continue active workout (when one exists) */}
          {activeWorkout && (
            <ActionRow
              key="continue"
              index={0}
              icon={Zap}
              iconColor={colors.green}
              label={`Continue Workout — ${activeWorkout.name}`}
              onPress={handleContinue}
              primary
            />
          )}

          {/* Start new workout — secondary when active exists */}
          <ActionRow
            key="workout"
            index={activeWorkout ? 1 : 0}
            icon={Dumbbell}
            iconColor={colors.blue2}
            label={activeWorkout ? "Start New Workout" : "Start Workout"}
            onPress={activeWorkout
              ? () => {
                  Alert.alert(
                    "Start New Workout?",
                    `You have "${activeWorkout.name}" in progress. Discard it and start fresh?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Discard & Start New",
                        style: "destructive",
                        onPress: handleStartNew,
                      },
                    ],
                  );
                }
              : () => {
                  onClose();
                  onStartWorkout?.();
                }
            }
          />

          {/* Secondary actions */}
          <ActionRow
            key="cardio"
            index={activeWorkout ? 2 : 1}
            icon={Activity}
            iconColor={colors.green}
            label="Start cardio"
            onPress={() => handleAction("cardio")}
          />
          <ActionRow
            key="metrics"
            index={activeWorkout ? 3 : 2}
            icon={Scale}
            iconColor={colors.purple}
            label="Log body metrics"
            onPress={() => handleAction("metrics")}
          />
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

// Re-export Scale for backwards compat in case it was used elsewhere
export { Scale };
