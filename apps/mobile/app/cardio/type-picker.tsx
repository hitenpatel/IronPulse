import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PersonStanding,
  Bike,
  Waves,
  Mountain,
  Footprints,
  Activity,
  Rows2,
  Ellipsis,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { TypeCard } from "@/components/cardio/type-card";

// v2 acid-sport tokens re-aliased onto legacy `C` shape.
import { colors as theme } from "@/lib/theme";

const C = {
  bg: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  muted: theme.bg2,
  primary: theme.green,
  border: theme.line,
  text: theme.text,
  textSecondary: theme.text3,
  textTertiary: theme.text4,
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
  { key: "row", label: "Row", icon: Rows2, gps: false },
  { key: "elliptical", label: "Elliptical", icon: Ellipsis, gps: false },
  { key: "other", label: "Other", icon: Activity, gps: false },
];

export default function TypePickerScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedType, setSelectedType] = useState<ActivityType | null>(null);

  function handleTypePress(activity: ActivityType) {
    if (!activity.gps) {
      navigation.navigate("CardioManual", { type: activity.key });
      return;
    }
    setSelectedType(activity);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
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
              fontSize: 18,
              fontWeight: "500",
              color: C.text,
              letterSpacing: -0.3,
            }}
          >
            Start Cardio
          </Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: C.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} color={C.textSecondary} />
          </Pressable>
        </View>

        {selectedType === null ? (
          <>
            <Text
              style={{
                fontSize: 13,
                color: C.textSecondary,
                marginBottom: 16,
              }}
            >
              Choose an activity
            </Text>

            {/* 2-column grid */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 12,
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

            {/* Or log manually link */}
            <Pressable
              style={{ alignItems: "center", marginTop: 24 }}
              onPress={() => navigation.navigate("CardioManual", { type: "other" })}
            >
              <Text style={{ color: C.primary, fontSize: 14, fontWeight: "500" }}>
                Or log manually
              </Text>
            </Pressable>
          </>
        ) : (
          <View style={{ flex: 1, justifyContent: "center", gap: 16, paddingHorizontal: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: C.text,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              How do you want to log your {selectedType.label.toLowerCase()}?
            </Text>

            <Pressable
              style={{
                backgroundColor: C.primary,
                borderRadius: 12,
                padding: 18,
                alignItems: "center",
              }}
              onPress={() =>
                navigation.navigate("CardioTracking", { type: selectedType.key })
              }
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: "#FFFFFF",
                }}
              >
                Track with GPS
              </Text>
            </Pressable>

            <Pressable
              style={{
                backgroundColor: C.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.border,
                padding: 18,
                alignItems: "center",
              }}
              onPress={() =>
                navigation.navigate("CardioManual", { type: selectedType.key })
              }
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "600",
                  color: C.text,
                }}
              >
                Log Manually
              </Text>
            </Pressable>

            <Pressable
              style={{ alignItems: "center", paddingTop: 12 }}
              onPress={() => setSelectedType(null)}
            >
              <Text style={{ color: C.textSecondary, fontSize: 14 }}>Back</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
