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
import { Button } from "@/components/ui/button";
import { WeightChart } from "@/components/stats/weight-chart";
import { writeWeightToHealthKit } from "@/lib/healthkit";
import { writeWeightToGoogleFit } from "@/lib/googlefit";

const STATUS_COLORS: Record<string, string> = {
  Fresh: "#22c55e",
  Optimal: "#3b82f6",
  Fatigued: "#f97316",
  Overreaching: "#ef4444",
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

    const id = crypto.randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    await db.execute(
      "INSERT INTO body_metrics (id, user_id, date, weight_kg, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, user?.id, today, value, now],
    );

    writeWeightToHealthKit(parseFloat(weight), today).catch(() => {});
    writeWeightToGoogleFit(parseFloat(weight), new Date()).catch(() => {});

    setWeight("");
  };

  const maxVolume = muscleVolume.length > 0 ? muscleVolume[0].volume : 1;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text
            style={{
              fontSize: 24,
              fontWeight: "bold",
              color: "hsl(213, 31%, 91%)",
              marginBottom: 16,
            }}
          >
            Stats
          </Text>

          {/* Training Status Badge */}
          <Card style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: "hsl(213, 31%, 91%)",
                fontWeight: "600",
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              Training Status
            </Text>
            {loading ? (
              <ActivityIndicator color="hsl(215, 20%, 65%)" />
            ) : fitnessStatus ? (
              <View>
                <View
                  style={{
                    alignSelf: "flex-start",
                    backgroundColor:
                      STATUS_COLORS[fitnessStatus.status] ?? "#6b7280",
                    paddingHorizontal: 16,
                    paddingVertical: 6,
                    borderRadius: 20,
                    marginBottom: 12,
                  }}
                >
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {fitnessStatus.status}
                  </Text>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: "hsl(215, 20%, 65%)",
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      ATL (Fatigue)
                    </Text>
                    <Text
                      style={{
                        color: "hsl(213, 31%, 91%)",
                        fontWeight: "600",
                        fontSize: 18,
                      }}
                    >
                      {fitnessStatus.atl}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: "hsl(215, 20%, 65%)",
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      CTL (Fitness)
                    </Text>
                    <Text
                      style={{
                        color: "hsl(213, 31%, 91%)",
                        fontWeight: "600",
                        fontSize: 18,
                      }}
                    >
                      {fitnessStatus.ctl}
                    </Text>
                  </View>
                  <View style={{ alignItems: "center", flex: 1 }}>
                    <Text
                      style={{
                        color: "hsl(215, 20%, 65%)",
                        fontSize: 12,
                        marginBottom: 2,
                      }}
                    >
                      TSB (Form)
                    </Text>
                    <Text
                      style={{
                        color: "hsl(213, 31%, 91%)",
                        fontWeight: "600",
                        fontSize: 18,
                      }}
                    >
                      {fitnessStatus.tsb}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <Text style={{ color: "hsl(215, 20%, 65%)" }}>
                No training data yet
              </Text>
            )}
          </Card>

          {/* Muscle Volume - Top 5 */}
          <Card style={{ marginBottom: 16 }}>
            <Text
              style={{
                color: "hsl(213, 31%, 91%)",
                fontWeight: "600",
                fontSize: 14,
                marginBottom: 12,
              }}
            >
              Top Muscle Groups (7 days)
            </Text>
            {loading ? (
              <ActivityIndicator color="hsl(215, 20%, 65%)" />
            ) : muscleVolume.length > 0 ? (
              <View style={{ gap: 8 }}>
                {muscleVolume.map((m) => (
                  <View key={m.muscle}>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 4,
                      }}
                    >
                      <Text
                        style={{
                          color: "hsl(213, 31%, 91%)",
                          fontSize: 13,
                          textTransform: "capitalize",
                        }}
                      >
                        {m.muscle}
                      </Text>
                      <Text
                        style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}
                      >
                        {m.percentage}%
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 8,
                        backgroundColor: "hsl(217, 33%, 17%)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <View
                        style={{
                          height: 8,
                          width: `${(m.volume / maxVolume) * 100}%`,
                          backgroundColor: "#3b82f6",
                          borderRadius: 4,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: "hsl(215, 20%, 65%)" }}>
                No volume data this week
              </Text>
            )}
          </Card>

          {/* Progress Photos */}
          {photos.length > 0 && (
            <Card style={{ marginBottom: 16 }}>
              <Text
                style={{
                  color: "hsl(213, 31%, 91%)",
                  fontWeight: "600",
                  fontSize: 14,
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
                      backgroundColor: "hsl(217, 33%, 17%)",
                      borderRadius: 8,
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
                          color: "hsl(213, 31%, 91%)",
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        {new Date(item.date).toLocaleDateString()}
                      </Text>
                      {item.notes && (
                        <Text
                          style={{
                            color: "hsl(215, 20%, 65%)",
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

          {/* Weight Chart */}
          <WeightChart data={weightData} />

          {/* Log Weight Form */}
          <Card style={{ gap: 12, marginBottom: 16 }}>
            <Text
              style={{
                color: "hsl(213, 31%, 91%)",
                fontWeight: "600",
                fontSize: 14,
              }}
            >
              Log Weight
            </Text>
            <TextInput
              testID="weight-input"
              placeholder="Weight (kg)"
              placeholderTextColor="hsl(215, 20%, 65%)"
              keyboardType="decimal-pad"
              value={weight}
              onChangeText={setWeight}
              style={{
                borderWidth: 1,
                borderColor: "hsl(217, 33%, 17%)",
                borderRadius: 8,
                backgroundColor: "hsl(224, 71%, 4%)",
                color: "hsl(213, 31%, 91%)",
                paddingHorizontal: 12,
                paddingVertical: 10,
                fontSize: 16,
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
                  <Text style={{ color: "hsl(213, 31%, 91%)" }}>
                    {new Date(item.date).toLocaleDateString()}
                  </Text>
                  <Text
                    style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}
                  >
                    {item.weight_kg != null ? `${item.weight_kg} kg` : "\u2014"}
                  </Text>
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
                style={{ color: "hsl(215, 20%, 65%)", textAlign: "center" }}
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
