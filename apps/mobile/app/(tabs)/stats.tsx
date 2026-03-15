import { useState } from "react";
import { View, Text, FlatList, TextInput, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useBodyMetrics } from "@ironpulse/sync";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WeightChart } from "@/components/stats/weight-chart";

export default function StatsScreen() {
  const { data: metrics } = useBodyMetrics();
  const { user } = useAuth();
  const db = usePowerSync();
  const [weight, setWeight] = useState("");

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

    setWeight("");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
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

        <WeightChart data={weightData} />

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
      </View>

      {(metrics ?? []).length > 0 ? (
        <FlatList
          data={metrics}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item }) => (
            <Card
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
          )}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 16,
          }}
        >
          <Text style={{ color: "hsl(215, 20%, 65%)", textAlign: "center" }}>
            More analytics coming soon
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
