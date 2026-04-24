import { useState } from "react";
import { View, Text, Pressable, Alert, ScrollView } from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RootStackParamList } from "../../App";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type FitnessGoal = "lose_weight" | "build_muscle" | "endurance" | "general";
type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const FITNESS_GOALS: { value: FitnessGoal; label: string; description: string; icon: string }[] = [
  { value: "lose_weight", label: "Lose Weight", description: "Burn fat and improve body composition", icon: "🔥" },
  { value: "build_muscle", label: "Build Muscle", description: "Gain strength and increase muscle mass", icon: "💪" },
  { value: "endurance", label: "Endurance", description: "Improve cardio and stamina", icon: "🏃" },
  { value: "general", label: "General Fitness", description: "Stay active and maintain overall health", icon: "⚡" },
];

const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string; description: string; icon: string }[] = [
  { value: "beginner", label: "Beginner", description: "New to fitness or returning after a long break", icon: "🌱" },
  { value: "intermediate", label: "Intermediate", description: "Training consistently for 6+ months", icon: "📈" },
  { value: "advanced", label: "Advanced", description: "Training seriously for 2+ years", icon: "🏆" },
];

const COLORS = {
  bg: "hsl(224, 71%, 4%)",
  text: "hsl(213, 31%, 91%)",
  muted: "hsl(215, 20%, 65%)",
  border: "hsl(216, 34%, 17%)",
  primary: "hsl(210, 40%, 98%)",
  primaryDim: "hsl(217, 33%, 17%)",
  selectedBorder: "hsl(210, 40%, 98%)",
  selectedBg: "hsl(217, 33%, 17%)",
  selectedText: "hsl(210, 40%, 98%)",
  error: "hsl(0, 72%, 51%)",
};

export default function OnboardingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name ?? "");
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal | null>(null);
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleNext() {
    if (step === 1 && !name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);
    setStep((s) => s + 1);
  }

  function handleBack() {
    setError(null);
    setStep((s) => s - 1);
  }

  async function handleFinish(options?: { goToImport?: boolean }) {
    setError(null);
    setLoading(true);
    try {
      await trpc.user.completeOnboarding.mutate({
        name: name.trim(),
        unitSystem,
        ...(fitnessGoal && { fitnessGoal }),
        ...(experienceLevel && { experienceLevel }),
      });
      await updateUser({
        name: name.trim(),
        unitSystem,
        onboardingComplete: true,
      });
      if (options?.goToImport) {
        // Land on ImportData stacked over MainTabs so the user can still
        // back out to the dashboard with the native back gesture.
        navigation.dispatch(
          CommonActions.reset({
            index: 1,
            routes: [{ name: "MainTabs" }, { name: "ImportData" }],
          }),
        );
      } else {
        navigation.dispatch(
          CommonActions.reset({ index: 0, routes: [{ name: "MainTabs" }] }),
        );
      }
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
      Alert.alert("Error", err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 24, paddingVertical: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicator */}
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 32 }}>
          {[1, 2, 3, 4].map((s) => (
            <View key={s} style={{ flexDirection: "row", alignItems: "center" }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    s === step
                      ? COLORS.primary
                      : s < step
                        ? COLORS.primaryDim
                        : COLORS.primaryDim,
                  borderWidth: s < step ? 0 : 1,
                  borderColor: s === step ? "transparent" : COLORS.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: s === step ? COLORS.bg : s < step ? COLORS.primary : COLORS.muted,
                  }}
                >
                  {s < step ? "✓" : s}
                </Text>
              </View>
              {s < 4 && (
                <View
                  style={{
                    width: 32,
                    height: 1,
                    backgroundColor: s < step ? COLORS.primary : COLORS.border,
                    marginHorizontal: 4,
                  }}
                />
              )}
            </View>
          ))}
          <Text style={{ marginLeft: 10, fontSize: 12, color: COLORS.muted }}>
            Step {step} of 4
          </Text>
        </View>

        {/* Step 1: Name + Unit System */}
        {step === 1 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: COLORS.text }}>
              Let's get you set up
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, color: COLORS.muted }}>
              Just a couple of things before you start
            </Text>

            <View style={{ marginTop: 28, gap: 20 }}>
              <Input
                label="Name"
                testID="onboarding-name-input"
                accessibilityLabel="Name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
                autoCorrect={false}
              />

              <View>
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "500",
                    color: COLORS.text,
                    marginBottom: 8,
                  }}
                >
                  Unit preference
                </Text>
                <View style={{ flexDirection: "row", gap: 12 }}>
                  {(["metric", "imperial"] as const).map((unit) => (
                    <Pressable
                      key={unit}
                      testID={`unit-${unit}`}
                      accessibilityLabel={unit === "metric" ? "Metric (kg, km)" : "Imperial (lbs, mi)"}
                      onPress={() => setUnitSystem(unit)}
                      style={{
                        flex: 1,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor:
                          unitSystem === unit ? COLORS.selectedBorder : COLORS.border,
                        backgroundColor:
                          unitSystem === unit ? COLORS.selectedBg : "transparent",
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: unitSystem === unit ? COLORS.selectedText : COLORS.muted,
                        }}
                      >
                        {unit === "metric" ? "Metric" : "Imperial"}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: unitSystem === unit ? COLORS.muted : COLORS.border,
                          marginTop: 2,
                        }}
                      >
                        {unit === "metric" ? "kg, km" : "lbs, mi"}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {error ? (
                <Text style={{ fontSize: 14, color: COLORS.error }}>{error}</Text>
              ) : null}

              <Button testID="onboarding-next-1" onPress={handleNext}>
                Next
              </Button>
            </View>
          </View>
        )}

        {/* Step 2: Fitness Goal */}
        {step === 2 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: COLORS.text }}>
              What's your main goal?
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, color: COLORS.muted }}>
              This helps us tailor your experience. You can skip this.
            </Text>

            <View style={{ marginTop: 24, gap: 10 }}>
              {FITNESS_GOALS.map((goal) => (
                <Pressable
                  key={goal.value}
                  testID={`goal-${goal.value}`}
                  accessibilityLabel={goal.label}
                  onPress={() => setFitnessGoal(goal.value)}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 14,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      fitnessGoal === goal.value ? COLORS.selectedBorder : COLORS.border,
                    backgroundColor:
                      fitnessGoal === goal.value ? COLORS.selectedBg : "transparent",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ fontSize: 24, marginTop: 1 }}>{goal.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          fitnessGoal === goal.value ? COLORS.selectedText : COLORS.text,
                      }}
                    >
                      {goal.label}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}
                    >
                      {goal.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {error ? (
              <Text style={{ fontSize: 14, color: COLORS.error, marginTop: 12 }}>{error}</Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <View style={{ flex: 1 }}>
                <Button testID="onboarding-back-2" variant="outline" onPress={handleBack}>
                  Back
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button testID="onboarding-next-2" onPress={handleNext}>
                  {fitnessGoal ? "Next" : "Skip"}
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* Step 3: Experience Level */}
        {step === 3 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: COLORS.text }}>
              Your experience level?
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, color: COLORS.muted }}>
              We'll use this to set sensible defaults. You can skip this.
            </Text>

            <View style={{ marginTop: 24, gap: 10 }}>
              {EXPERIENCE_LEVELS.map((level) => (
                <Pressable
                  key={level.value}
                  testID={`level-${level.value}`}
                  accessibilityLabel={level.label}
                  onPress={() => setExperienceLevel(level.value)}
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 14,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor:
                      experienceLevel === level.value ? COLORS.selectedBorder : COLORS.border,
                    backgroundColor:
                      experienceLevel === level.value ? COLORS.selectedBg : "transparent",
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                  }}
                >
                  <Text style={{ fontSize: 24, marginTop: 1 }}>{level.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color:
                          experienceLevel === level.value
                            ? COLORS.selectedText
                            : COLORS.text,
                      }}
                    >
                      {level.label}
                    </Text>
                    <Text
                      style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}
                    >
                      {level.description}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {error ? (
              <Text style={{ fontSize: 14, color: COLORS.error, marginTop: 12 }}>{error}</Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <View style={{ flex: 1 }}>
                <Button testID="onboarding-back-3" variant="outline" onPress={handleBack}>
                  Back
                </Button>
              </View>
              <View style={{ flex: 1 }}>
                <Button testID="onboarding-next-3" onPress={handleNext}>
                  {experienceLevel ? "Next" : "Skip"}
                </Button>
              </View>
            </View>
          </View>
        )}

        {/* Step 4: Import existing data */}
        {step === 4 && (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 22, fontWeight: "bold", color: COLORS.text }}>
              Switching from another app?
            </Text>
            <Text style={{ marginTop: 6, fontSize: 14, color: COLORS.muted }}>
              Import your workout history from Strong, Hevy, or FitNotes. You
              can always do this later from Settings.
            </Text>

            <View style={{ marginTop: 24, gap: 10 }}>
              <Pressable
                testID="onboarding-import-yes"
                accessibilityLabel="Import my data"
                disabled={loading}
                onPress={() => handleFinish({ goToImport: true })}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 14,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.selectedBorder,
                  backgroundColor: COLORS.selectedBg,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 24, marginTop: 1 }}>📥</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: COLORS.selectedText,
                    }}
                  >
                    Yes, import my data
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}
                  >
                    Upload a CSV export on the next screen.
                  </Text>
                </View>
              </Pressable>

              <Pressable
                testID="onboarding-import-skip"
                accessibilityLabel="Start fresh"
                disabled={loading}
                onPress={() => handleFinish({ goToImport: false })}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 14,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  paddingHorizontal: 14,
                  paddingVertical: 14,
                  opacity: loading ? 0.5 : 1,
                }}
              >
                <Text style={{ fontSize: 24, marginTop: 1 }}>🚀</Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{ fontSize: 14, fontWeight: "600", color: COLORS.text }}
                  >
                    Start fresh
                  </Text>
                  <Text
                    style={{ fontSize: 12, color: COLORS.muted, marginTop: 2 }}
                  >
                    Skip — I don&apos;t have data to import.
                  </Text>
                </View>
              </Pressable>
            </View>

            {error ? (
              <Text style={{ fontSize: 14, color: COLORS.error, marginTop: 12 }}>
                {error}
              </Text>
            ) : null}

            <View style={{ flexDirection: "row", gap: 12, marginTop: 24 }}>
              <View style={{ flex: 1 }}>
                <Button
                  testID="onboarding-back-4"
                  variant="outline"
                  onPress={handleBack}
                  disabled={loading}
                >
                  Back
                </Button>
              </View>
              {loading && (
                <View
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, color: COLORS.muted }}>
                    Setting up…
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
