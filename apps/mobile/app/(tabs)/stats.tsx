import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBodyMetrics } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";

export default function StatsScreen() {
  const { data: metrics } = useBodyMetrics();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
          }}
        >
          Stats
        </Text>
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
