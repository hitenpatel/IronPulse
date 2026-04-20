import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import {
  ChevronRight,
  ClipboardList,
  Crown,
  MessageSquare,
  Users,
} from "lucide-react-native";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  muted: theme.bg2,
  primary: theme.green,
  success: theme.blue, // lime
  warning: theme.amber,
  gold: theme.amber,
  border: theme.line,
  borderSubtle: theme.lineSoft,
  foreground: theme.text,
  mutedFg: theme.text3,
  dimFg: theme.text4,
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

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 14,
        alignItems: "center",
        gap: 6,
      }}
    >
      {icon}
      <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: colors.mutedFg, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

export default function CoachScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const isCoach = user?.tier === "coach";

  const load = useCallback(async () => {
    if (!isCoach) {
      setLoading(false);
      return;
    }
    try {
      const result = await trpc.coach.clients.query();
      setClients(result as Client[]);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [isCoach]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }} edges={["bottom"]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!isCoach) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 16 }}>
          <Crown size={48} color={colors.gold} />
          <Text style={{ color: colors.foreground, fontSize: 22, fontWeight: "700", textAlign: "center" }}>
            Coach Dashboard
          </Text>
          <Text style={{ color: colors.mutedFg, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
            Upgrade to the Coach tier to manage clients,{"\n"}build programs, and message athletes.
          </Text>
          <Pressable
            onPress={() => navigation.navigate("SettingsSubscription")}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 10,
              paddingHorizontal: 24,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "600", fontSize: 15 }}>View Pricing</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const activeClients = clients.filter((c) => c.status === "active").length;
  const withProgram = clients.filter((c) => c.programName != null).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Summary cards */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <StatCard
            icon={<Users size={18} color={colors.primary} />}
            value={clients.length}
            label="Clients"
          />
          <StatCard
            icon={<ClipboardList size={18} color={colors.success} />}
            value={withProgram}
            label="With Programs"
          />
          <Pressable style={{ flex: 1 }} onPress={() => navigation.navigate("Messages")}>
            <View
              style={{
                flex: 1,
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <MessageSquare size={18} color={colors.gold} />
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>Chat</Text>
              <Text style={{ color: colors.mutedFg, fontSize: 11 }}>Messages</Text>
            </View>
          </Pressable>
        </View>

        {/* Client list */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.mutedFg, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Clients ({activeClients} active)
          </Text>

          {clients.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32, gap: 10 }}>
              <Users size={36} color={colors.dimFg} />
              <Text style={{ color: colors.mutedFg, fontSize: 14 }}>No clients yet</Text>
            </View>
          ) : (
            clients.map((client) => (
              <Pressable
                key={client.assignmentId}
                onPress={() => navigation.navigate("CoachClientDetail", { id: client.athleteId })}
                style={{
                  backgroundColor: colors.card,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 14,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                {/* Avatar */}
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
                    <Text style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}>
                      {client.athleteName?.charAt(0).toUpperCase() ?? "?"}
                    </Text>
                  </View>
                  <View
                    style={{
                      position: "absolute",
                      bottom: 0,
                      right: 0,
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: client.status === "active" ? colors.success : colors.dimFg,
                      borderWidth: 2,
                      borderColor: colors.card,
                    }}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.foreground, fontWeight: "600", fontSize: 15 }}>
                    {client.athleteName}
                  </Text>
                  <Text
                    style={{
                      color: client.status === "inactive" ? colors.warning : colors.mutedFg,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {client.programName ?? "No program assigned"}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.dimFg} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
