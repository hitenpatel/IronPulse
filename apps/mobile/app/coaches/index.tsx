import React, { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Star, Users } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  border: "#1E2B47",
  borderSubtle: "#152035",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  primary: "#0077FF",
};

const SPECIALTIES = ["All", "Powerlifting", "Hypertrophy", "Running", "CrossFit", "Yoga", "HIIT", "Calisthenics"];

type CoachProfile = Awaited<ReturnType<typeof trpc.coach.listPublicCoaches.query>>["coaches"][number];

export default function CoachesBrowseScreen() {
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("All");
  const [coaches, setCoaches] = useState<CoachProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await trpc.coach.listPublicCoaches.query({
        search: debouncedSearch || undefined,
        specialty: specialty !== "All" ? specialty : undefined,
        limit: 30 as number,
      });
      setCoaches(result.coaches);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, specialty]);

  useEffect(() => { load(); }, [load]);

  function getInitials(name: string): string {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      {/* Search + Filters */}
      <View style={{ padding: 16, paddingBottom: 8, gap: 10 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 8,
            height: 44,
            paddingHorizontal: 12,
            gap: 8,
          }}
        >
          <Search size={16} color={colors.dimFg} />
          <TextInput
            style={{ flex: 1, color: colors.foreground, fontSize: 15 }}
            placeholder="Search coaches..."
            placeholderTextColor={colors.dimFg}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
          />
        </View>

        <FlatList
          horizontal
          data={SPECIALTIES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
          renderItem={({ item }) => {
            const isActive = specialty === item;
            return (
              <Pressable
                onPress={() => setSpecialty(item)}
                style={{
                  backgroundColor: isActive ? colors.primary : colors.accent,
                  borderWidth: 1,
                  borderColor: isActive ? colors.primary : colors.border,
                  borderRadius: 20,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                }}
              >
                <Text style={{ color: isActive ? "#fff" : colors.mutedFg, fontSize: 13, fontWeight: "500" }}>
                  {item}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.foreground} size="large" />
        </View>
      ) : coaches.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Users size={40} color={colors.dimFg} />
          <Text style={{ color: colors.mutedFg, fontSize: 15 }}>No coaches found.</Text>
        </View>
      ) : (
        <FlatList
          data={coaches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <View
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 14,
                flexDirection: "row",
                gap: 12,
                alignItems: "flex-start",
              }}
            >
              {/* Avatar */}
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: colors.accent,
                  borderWidth: 1,
                  borderColor: colors.border,
                  overflow: "hidden",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {item.user.avatarUrl ? (
                  <Image source={{ uri: item.user.avatarUrl }} style={{ width: 52, height: 52 }} />
                ) : (
                  <Text style={{ color: colors.mutedFg, fontSize: 18, fontWeight: "700" }}>
                    {getInitials(item.user.name ?? "?")}
                  </Text>
                )}
              </View>

              {/* Info */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}>
                  {item.user.name}
                </Text>

                {item.specialties.length > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {item.specialties.slice(0, 2).map((s) => (
                      <View
                        key={s}
                        style={{
                          backgroundColor: colors.accent,
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderWidth: 1,
                          borderColor: colors.border,
                        }}
                      >
                        <Text style={{ color: colors.mutedFg, fontSize: 11, fontWeight: "500" }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {item.bio && (
                  <Text style={{ color: colors.mutedFg, fontSize: 13, lineHeight: 18 }} numberOfLines={2}>
                    {item.bio}
                  </Text>
                )}

                {item.activeClientCount != null && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Users size={12} color={colors.dimFg} />
                    <Text style={{ color: colors.dimFg, fontSize: 12 }}>{item.activeClientCount} clients</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
