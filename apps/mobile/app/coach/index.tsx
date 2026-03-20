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
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  primary: "#0077FF",
  success: "#10B981",
  warning: "#F59E0B",
  border: "#1E2B47",
  text: "#F0F4F8",
  textMuted: "#8899B4",
  textFaint: "#4E6180",
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
        <ActivityIndicator color={colors.primary} />
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
        <Users size={40} color={colors.textFaint} />
        <Text
          style={{
            color: colors.textFaint,
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
          <Users size={40} color={colors.textFaint} />
          <Text
            style={{
              color: colors.textFaint,
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
          renderItem={({ item }) => {
            const isLowAdherence = item.status === "inactive";
            return (
              <Pressable
                onPress={() => router.push(`/coach/clients/${item.athleteId}`)}
              >
                <View
                  style={{
                    backgroundColor: colors.card,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  {/* Avatar with status dot */}
                  <View style={{ position: "relative" }}>
                    <View
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        backgroundColor: colors.accent,
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "700",
                          fontSize: 18,
                        }}
                      >
                        {item.athleteName?.charAt(0).toUpperCase() ?? "?"}
                      </Text>
                    </View>
                    {/* Status dot */}
                    <View
                      style={{
                        position: "absolute",
                        bottom: 0,
                        right: 0,
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor:
                          item.status === "active" ? colors.success : colors.textFaint,
                        borderWidth: 2,
                        borderColor: colors.card,
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        color: colors.text,
                        fontWeight: "600",
                        fontSize: 15,
                      }}
                    >
                      {item.athleteName}
                    </Text>
                    <Text
                      style={{
                        color: isLowAdherence ? colors.warning : colors.textMuted,
                        fontSize: 12,
                        marginTop: 2,
                      }}
                    >
                      {item.programName ?? "No program assigned"}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textFaint} />
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}
