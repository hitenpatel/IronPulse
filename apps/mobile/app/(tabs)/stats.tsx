import { useState, useEffect } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useBodyMetrics } from "@ironpulse/sync";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WeightChart } from "@/components/stats/weight-chart";
import { writeWeightToHealthKit } from "@/lib/healthkit";
import { writeWeightToGoogleFit } from "@/lib/googlefit";

// Pulse design system tokens
const C = {
  bg: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  primary: "#0077FF",
  success: "#10B981",
  warning: "#F59E0B",
  border: "#1E2B47",
  text: "#F0F4F8",
  textSecondary: "#8899B4",
  textTertiary: "#4E6180",
};

// Map fitness status to Badge variant
const STATUS_BADGE_VARIANT: Record<string, "success" | "default" | "warning" | "destructive"> = {
  Fresh: "success",
  Optimal: "default",
  Fatigued: "warning",
  Overreaching: "destructive",
};

type FitnessStatus = {
  atl: number;
  ctl: number;
  tsb: number;
  status: string;
};

type MuscleVolume = {
  muscle: string;
  volume: number;
  percentage: number;
};

type ProgressPhoto = {
  id: string;
  photoUrl: string;
  imageUrl: string;
  date: Date;
  notes: string | null;
};

export default function StatsScreen() {
  const { data: metrics } = useBodyMetrics();
  const { user } = useAuth();
  const db = usePowerSync();
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");

  const [fitnessStatus, setFitnessStatus] = useState<FitnessStatus | null>(
    null,
  );
  const [muscleVolume, setMuscleVolume] = useState<MuscleVolume[]>([]);
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [statusRes, volumeRes, photosRes] = await Promise.all([
          trpc.analytics.fitnessStatus.query(),
          trpc.analytics.muscleVolume.query({ days: 7 }),
          trpc.progressPhoto.list.query(),
        ]);
        setFitnessStatus(statusRes);
        setMuscleVolume(volumeRes.data.slice(0, 5));
        setPhotos(photosRes);
      } catch {
        // silently fail — cards will show empty state
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const weightData = (metrics ?? [])
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ date: m.date, weight_kg: m.weight_kg! }));

  const handleLogWeight = async () => {
    const value = parseFloat(weight);
    if (isNaN(value) || value <= 0) {
      Alert.alert("Invalid weight", "Please enter a valid weight.");
      return;
    }

    const bodyFatValue = bodyFat !== "" ? parseFloat(bodyFat) : null;
    if (
      bodyFatValue !== null &&
      (isNaN(bodyFatValue) || bodyFatValue < 0 || bodyFatValue > 100)
    ) {
      Alert.alert("Invalid body fat", "Body fat must be between 0 and 100.");
      return;
    }

    const id = crypto.randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    await db.execute(
      "INSERT INTO body_metrics (id, user_id, date, weight_kg, body_fat_pct, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [id, user?.id, today, value, bodyFatValue, now],
    );

    writeWeightToHealthKit(parseFloat(weight), today).catch(() => {});
    writeWeightToGoogleFit(parseFloat(weight), new Date()).catch(() => {});

    setWeight("");
    setBodyFat("");
  };

  const maxVolume = muscleVolume.length > 0 ? muscleVolume[0].volume : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          {/* Page heading */}
          <Text
            style={{
              fontSize: 28,
              fontWeight: "600",
              fontFamily: "SpaceGrotesk-Bold",
              color: C.text,
              marginBottom: 16,
            }}
          >
            Stats
          </Text>

          {/* Training Status card */}
          <Card style={{ marginBottom: 12 }}>
            <Text
              style={{
                color: C.textSecondary,
                fontWeight: "600",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 12,
              }}
            >
              Training Status
            </Text>
            {loading ? (
              <ActivityIndicator color={C.textSecondary} />
            ) : fitnessStatus ? (
              <View>
                {/* Status pill — Badge component */}
                <View style={{ alignSelf: "flex-start", marginBottom: 16 }}>
                  <Badge
                    variant={
                      STATUS_BADGE_VARIANT[fitnessStatus.status] ?? "default"
                    }
                  >
                    {fitnessStatus.status}
                  </Badge>
                </View>

                {/* 3-metric row */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: C.textSecondary,
                        fontSize: 11,
                        marginBottom: 4,
                      }}
                    >
                      ATL (Fatigue)
                    </Text>
                    <Text
                      style={{
                        color: C.text,
                        fontWeight: "600",
                        fontSize: 20,
                      }}
                    >
                      {fitnessStatus.atl}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 1,
                      backgroundColor: C.border,
                      marginVertical: 2,
                    }}
                  />
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: C.textSecondary,
                        fontSize: 11,
                        marginBottom: 4,
                      }}
                    >
                      CTL (Fitness)
                    </Text>
                    <Text
                      style={{
                        color: C.text,
                        fontWeight: "600",
                        fontSize: 20,
                      }}
                    >
                      {fitnessStatus.ctl}
                    </Text>
                  </View>
                  <View
                    style={{
                      width: 1,
                      backgroundColor: C.border,
                      marginVertical: 2,
                    }}
                  />
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: C.textSecondary,
                        fontSize: 11,
                        marginBottom: 4,
                      }}
                    >
                      TSB (Form)
                    </Text>
                    <Text
                      style={{
                        color: C.text,
                        fontWeight: "600",
                        fontSize: 20,
                      }}
                    >
                      {fitnessStatus.tsb}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={{ color: C.textSecondary }}>
                No training data yet
              </Text>
            )}
          </Card>

          {/* Volume chart card — stacked bars */}
          <Card style={{ marginBottom: 12 }}>
            <Text
              style={{
                color: C.textSecondary,
                fontWeight: "600",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 0.6,
                marginBottom: 12,
              }}
            >
              Top Muscle Groups (7 days)
            </Text>
            {loading ? (
              <ActivityIndicator color={C.textSecondary} />
            ) : muscleVolume.length > 0 ? (
              <View style={{ gap: 10 }}>
                {muscleVolume.map((m) => (
                  <View key={m.muscle}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 5,
                      }}
                    >
                      <Text
                        style={{
                          color: C.text,
                          fontSize: 13,
                          fontWeight: "500",
                          textTransform: "capitalize",
                        }}
                      >
                        {m.muscle}
                      </Text>
                      <Text
                        style={{ color: C.textSecondary, fontSize: 12 }}
                      >
                        {m.percentage}%
                      </Text>
                    </View>
                    {/* Bar track */}
                    <View
                      style={{
                        height: 6,
                        backgroundColor: C.accent,
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: 6,
                          width: `${(m.volume / maxVolume) * 100}%`,
                          backgroundColor: C.primary,
                          borderRadius: 3,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: C.textSecondary }}>
                No volume data this week
              </Text>
            )}
          </Card>

          {/* Progress Photos */}
          {photos.length > 0 && (
            <Card style={{ marginBottom: 12 }}>
              <Text
                style={{
                  color: C.textSecondary,
                  fontWeight: "600",
                  fontSize: 12,
                  textTransform: "uppercase",
                  letterSpacing: 0.6,
                  marginBottom: 12,
                }}
              >
                Progress Photos
              </Text>
              <FlatList
                horizontal
                data={photos}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                  <View
                    style={{
                      width: 140,
                      backgroundColor: C.accent,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: C.border,
                      overflow: "hidden",
                    }}
                  >
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: 140, height: 140 }}
                      resizeMode="cover"
                    />
                    <View style={{ padding: 8 }}>
                      <Text
                        style={{
                          color: C.text,
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                      {item.notes && (
                        <Text
                          style={{
                            color: C.textSecondary,
                            fontSize: 11,
                            marginTop: 2,
                          }}
                          numberOfLines={2}
                        >
                          {item.notes}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              />
            </Card>
          )}

          {/* Body weight line chart */}
          <WeightChart data={weightData} />

          {/* Inline log weight form */}
          <Card style={{ gap: 12, marginBottom: 12 }}>
            <Text
              style={{
                color: C.text,
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              Log Weight
            </Text>
            <TextInput
              testID="weight-input"
              placeholder="Weight (kg)"
              placeholderTextColor={C.textTertiary}
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 8,
                backgroundColor: C.accent,
                color: C.text,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                height: 44,
              }}
            />
            <TextInput
              testID="body-fat-input"
              placeholder="Body fat % (optional)"
              placeholderTextColor={C.textTertiary}
              keyboardType="decimal-pad"
              value={bodyFat}
              onChangeText={setBodyFat}
              style={{
                borderWidth: 1,
                borderColor: C.border,
                borderRadius: 8,
                backgroundColor: C.accent,
                color: C.text,
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
                height: 44,
              }}
            />
            <Button testID="log-weight" onPress={handleLogWeight}>
              Log Weight
            </Button>
          </Card>

          {/* Body Metrics History */}
          {(metrics ?? []).length > 0 ? (
            <View style={{ gap: 8 }}>
              {(metrics ?? []).map((item) => (
                <Card
                  key={item.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: C.textSecondary, fontSize: 13 }}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text
                      style={{ color: C.text, fontWeight: "500" }}
                    >
                      {item.weight_kg != null ? `${item.weight_kg} kg` : "\u2014"}
                    </Text>
                    {item.body_fat_pct != null && (
                      <Text
                        style={{ color: C.textSecondary, fontSize: 12 }}
                      >
                        {Number(item.body_fat_pct).toFixed(1)}% body fat
                      </Text>
                    )}
                  </View>
                </Card>
              ))}
            </View>
          ) : (
            <Card
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 32,
              }}
            >
              <Text
                style={{ color: C.textSecondary, textAlign: "center" }}
              >
                No weight entries yet. Log your first weight above to start
                tracking.
              </Text>
            </Card>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
