import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import { Dumbbell, Activity } from "lucide-react-native";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const { data: workouts } = useWorkouts();
  const { data: cardioSessions } = useCardioSessions();

  const activities = [
    ...(workouts ?? []).slice(0, 5).map((w) => ({
      type: "workout" as const,
      id: w.id,
      name: w.name ?? "Workout",
      date: w.started_at,
    })),
    ...(cardioSessions ?? []).slice(0, 5).map((c) => ({
      type: "cardio" as const,
      id: c.id,
      name: c.type,
      date: c.started_at,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

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
          {getGreeting()}, {user?.name?.split(" ")[0]}
        </Text>
        <Text style={{ color: "hsl(215, 20%, 65%)", marginTop: 4 }}>
          Ready to train?
        </Text>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Card>
            <Text
              style={{
                color: "hsl(215, 20%, 65%)",
                textAlign: "center",
                paddingVertical: 32,
              }}
            >
              No activity yet. Start your first workout!
            </Text>
          </Card>
        }
        renderItem={({ item }) => (
          <Card style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            {item.type === "workout" ? (
              <Dumbbell size={20} color="hsl(210, 40%, 98%)" />
            ) : (
              <Activity size={20} color="hsl(210, 40%, 98%)" />
            )}
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: "hsl(213, 31%, 91%)",
                  fontWeight: "500",
                  textTransform: "capitalize",
                }}
              >
                {item.name}
              </Text>
              <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
