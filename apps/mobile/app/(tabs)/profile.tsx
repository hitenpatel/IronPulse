import { useState, useEffect } from "react";
import { View, Text, Pressable, Alert, Platform, Switch } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getBiometricLabel,
} from "@/lib/biometric";

export default function ProfileScreen() {
  const { user, signOut, updateUser } = useAuth();
  const router = useRouter();

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState("Biometric");
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    async function checkBiometric() {
      const available = await isBiometricAvailable();
      setBioAvailable(available);
      if (available) {
        const enabled = await isBiometricEnabled();
        setBioEnabled(enabled);
        const label = await getBiometricLabel();
        setBioLabel(label);
      }
    }
    checkBiometric();
  }, []);

  async function handleBiometricToggle(value: boolean) {
    setBioLoading(true);
    if (value) {
      const success = await enableBiometric();
      setBioEnabled(success);
    } else {
      await disableBiometric();
      setBioEnabled(false);
    }
    setBioLoading(false);
  }

  const handleEditName = () => {
    if (Platform.OS === "ios") {
      Alert.prompt(
        "Edit Name",
        "Enter your name",
        async (text) => {
          if (text?.trim()) {
            await trpc.user.updateProfile.mutate({ name: text.trim() });
            await updateUser({ name: text.trim() });
          }
        },
        "plain-text",
        user?.name,
      );
    } else {
      // Android fallback — Alert.prompt is iOS only
      Alert.alert("Edit Name", "Use the web app to update your name.");
    }
  };

  const handleUnitToggle = async (unit: "metric" | "imperial") => {
    if (unit === user?.unitSystem) return;
    await trpc.user.updateProfile.mutate({ unitSystem: unit });
    await updateUser({ unitSystem: unit });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
            marginBottom: 24,
          }}
        >
          Profile
        </Text>

        <Card style={{ gap: 16, marginBottom: 24 }}>
          <Pressable onPress={handleEditName}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <View>
                <Text
                  style={{
                    fontSize: 10,
                    color: "hsl(215, 20%, 65%)",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Name
                </Text>
                <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 18 }}>
                  {user?.name}
                </Text>
              </View>
              <ChevronRight size={18} color="hsl(215, 20%, 65%)" />
            </View>
          </Pressable>

          <View>
            <Text
              style={{
                fontSize: 10,
                color: "hsl(215, 20%, 65%)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Email
            </Text>
            <Text style={{ color: "hsl(213, 31%, 91%)" }}>{user?.email}</Text>
          </View>

          <View>
            <Text
              style={{
                fontSize: 10,
                color: "hsl(215, 20%, 65%)",
                textTransform: "uppercase",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              Units
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["metric", "imperial"] as const).map((unit) => {
                const isActive = user?.unitSystem === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() => handleUnitToggle(unit)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: isActive
                        ? "hsl(210, 40%, 98%)"
                        : "hsl(216, 34%, 17%)",
                    }}
                  >
                    <Text
                      style={{
                        fontWeight: "600",
                        textTransform: "capitalize",
                        color: isActive
                          ? "hsl(222.2, 47.4%, 11.2%)"
                          : "hsl(215, 20%, 65%)",
                      }}
                    >
                      {unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Card>

        <Pressable
          onPress={() => router.push("/settings" as any)}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Card style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16 }}>
              Settings
            </Text>
            <ChevronRight size={18} color="hsl(215, 20%, 65%)" />
          </Card>
        </Pressable>

        <Pressable
          onPress={() => router.push("/settings/integrations")}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Card style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16 }}>
              Connected Apps
            </Text>
            <ChevronRight size={18} color="hsl(215, 20%, 65%)" />
          </Card>
        </Pressable>

        <Pressable
          onPress={() => router.push("/settings/subscription" as any)}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Card style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16 }}>
              Subscription
            </Text>
            <ChevronRight size={18} color="hsl(215, 20%, 65%)" />
          </Card>
        </Pressable>

        <Pressable
          onPress={() => router.push("/coach" as any)}
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <Card style={{ flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16 }}>
              Coaching
            </Text>
            <ChevronRight size={18} color="hsl(215, 20%, 65%)" />
          </Card>
        </Pressable>

        {bioAvailable && (
          <Card style={{ marginBottom: 16, gap: 8 }}>
            <Text
              style={{
                fontSize: 10,
                color: "hsl(215, 20%, 65%)",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              Security
            </Text>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: "hsl(213, 31%, 91%)", fontSize: 16 }}>
                {bioLabel} Unlock
              </Text>
              <Switch
                value={bioEnabled}
                onValueChange={handleBiometricToggle}
                disabled={bioLoading}
                trackColor={{ false: "hsl(216, 34%, 17%)", true: "hsl(142, 71%, 45%)" }}
              />
            </View>
          </Card>
        )}

        <Card style={{ marginBottom: 16, gap: 8 }}>
          <Text
            style={{
              fontSize: 10,
              color: "hsl(215, 20%, 65%)",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Export Data
          </Text>
          <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 13 }}>
            Export your data on the web app at ironpulse.com/profile
          </Text>
        </Card>

        <Button variant="outline" onPress={signOut}>
          Sign Out
        </Button>
      </View>
    </SafeAreaView>
  );
}
