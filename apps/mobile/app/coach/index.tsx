import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { ChevronRight, Users } from "lucide-react-native";

const colors = {
  background: "hsl(224, 71%, 4%)",
  foreground: "hsl(213, 31%, 91%)",
  mutedFg: "hsl(215, 20%, 65%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(223, 47%, 11%)",
  accent: "hsl(216, 34%, 17%)",
};

type Client = {
  assignmentId: string;
  athleteId: string;
  athleteName: string;
  athleteEmail: string;
  programName: string | null;
  status: string;
  startedAt: string | null;
};

export default function CoachScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const isCoach = user?.tier === "coach";

  const fetchData = useCallback(async () => {
    try {
      if (isCoach) {
        const result = await trpc.coach.clients.query();
        setClients(result as Client[]);
      }
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [isCoach]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Stack.Screen options={{ title: "Coaching" }} />
        <ActivityIndicator color={colors.foreground} />
      </View>
    );
  }

  if (!isCoach) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          justifyContent: "center",
          alignItems: "center",
          padding: 32,
        }}
      >
        <Stack.Screen options={{ title: "Coaching" }} />
        <Users size={40} color={colors.mutedFg} />
        <Text
          style={{
            color: colors.mutedFg,
            fontSize: 15,
            textAlign: "center",
            marginTop: 12,
          }}
        >
          No coaching program assigned
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Coaching" }} />

      {clients.length === 0 ? (
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 32,
          }}
        >
          <Users size={40} color={colors.mutedFg} />
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 15,
              textAlign: "center",
              marginTop: 12,
            }}
          >
            No clients yet
          </Text>
        </View>
      ) : (
        <FlatList
          data={clients}
          keyExtractor={(item) => item.assignmentId}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/coach/clients/${item.athleteId}`)}
            >
              <View
                style={{
                  backgroundColor: colors.muted,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.accent,
                  padding: 16,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: colors.accent,
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: "700",
                      fontSize: 16,
                    }}
                  >
                    {item.athleteName?.charAt(0).toUpperCase() ?? "?"}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: colors.foreground,
                      fontWeight: "600",
                      fontSize: 15,
                    }}
                  >
                    {item.athleteName}
                  </Text>
                  <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                    {item.programName ?? "No program assigned"}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.mutedFg} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
