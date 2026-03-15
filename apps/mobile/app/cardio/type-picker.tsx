import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PersonStanding,
  Bike,
  Waves,
  Mountain,
  Footprints,
  Activity,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { TypeCard } from "@/components/cardio/type-card";

const colors = {
  bg: "hsl(224, 71%, 4%)",
  card: "hsl(216, 34%, 17%)",
  foreground: "hsl(213, 31%, 91%)",
  primary: "hsl(210, 40%, 98%)",
  muted: "hsl(215, 20%, 65%)",
};

interface ActivityType {
  key: string;
  label: string;
  icon: LucideIcon;
  gps: boolean;
}

const activityTypes: ActivityType[] = [
  { key: "run", label: "Run", icon: PersonStanding, gps: true },
  { key: "cycle", label: "Cycle", icon: Bike, gps: true },
  { key: "swim", label: "Swim", icon: Waves, gps: false },
  { key: "hike", label: "Hike", icon: Mountain, gps: true },
  { key: "walk", label: "Walk", icon: Footprints, gps: true },
  { key: "other", label: "Other", icon: Activity, gps: false },
];

export default function TypePickerScreen() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);

  function handleTypePress(activity: ActivityType) {
    if (!activity.gps) {
      router.push({ pathname: "/cardio/manual", params: { type: activity.key } });
      return;
    }
    setSelectedType(activity);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8 }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 24,
          }}
        >
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              color: colors.foreground,
            }}
          >
            Log Cardio
          </Text>
          <Pressable onPress={() => router.back()}>
            <X size={24} color={colors.muted} />
          </Pressable>
        </View>

        {selectedType === null ? (
          <>
            <Text
              style={{
                fontSize: 15,
                color: colors.muted,
                marginBottom: 20,
              }}
            >
              Choose an activity
            </Text>
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
                justifyContent: "space-between",
              }}
            >
              {activityTypes.map((a) => (
                <TypeCard
                  key={a.key}
                  label={a.label}
                  icon={a.icon}
                  onPress={() => handleTypePress(a)}
                />
              ))}
            </View>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", gap: 16, paddingHorizontal: 12 }}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: colors.foreground,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              How do you want to log your {selectedType.label.toLowerCase()}?
            </Text>

            <Pressable
              style={{
                backgroundColor: colors.primary,
                borderRadius: 12,
                padding: 18,
                alignItems: "center",
              }}
              onPress={() =>
                router.push({
                  pathname: "/cardio/tracking",
                  params: { type: selectedType.key },
                })
              }
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.bg,
                }}
              >
                Track with GPS
              </Text>
            </Pressable>

            <Pressable
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                padding: 18,
                alignItems: "center",
              }}
              onPress={() =>
                router.push({
                  pathname: "/cardio/manual",
                  params: { type: selectedType.key },
                })
              }
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: colors.foreground,
                }}
              >
                Log Manually
              </Text>
            </Pressable>

            <Pressable
              style={{ alignItems: "center", paddingTop: 12 }}
              onPress={() => setSelectedType(null)}
            >
              <Text style={{ color: colors.muted, fontSize: 14 }}>Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
