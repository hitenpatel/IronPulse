import { useState } from "react";
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExercises } from "@ironpulse/sync";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ExercisesScreen() {
  const [search, setSearch] = useState("");
  const { data: exercises } = useExercises({ search: search || undefined });

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
          Exercises
        </Text>
        <Input
          label=""
          placeholder="Search exercises..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={exercises ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <Text
            style={{
              color: "hsl(215, 20%, 65%)",
              textAlign: "center",
              paddingVertical: 32,
            }}
          >
            {search ? "No exercises found" : "Syncing exercises..."}
          </Text>
        }
        renderItem={({ item }) => (
          <Card>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
              {item.name}
            </Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
              {item.category && (
                <Text
                  style={{
                    fontSize: 12,
                    color: "hsl(215, 20%, 65%)",
                    textTransform: "capitalize",
                  }}
                >
                  {item.category}
                </Text>
              )}
              {item.primary_muscles && (
                <Text style={{ fontSize: 12, color: "hsl(215, 20%, 65%)" }}>
                  {(() => {
                    try {
                      return JSON.parse(item.primary_muscles).join(", ");
                    } catch {
                      return item.primary_muscles;
                    }
                  })()}
                </Text>
              )}
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}
