import { useState, useEffect, useCallback } from "react";
import {
  Alert,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
// Navigation header set via App.tsx screen options
import { Activity, BarChart3, Heart, Watch } from "lucide-react-native";
import { usePowerSync } from "@powersync/react";
import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
  isHealthKitAvailable,
  isHealthKitConnected,
  setHealthKitEnabled,
  requestPermissions,
  syncFromHealthKit,
  getLastSyncTimestamp,
} from "@/lib/healthkit";
import {
  isGoogleFitAvailable,
  isGoogleFitConnected,
  setGoogleFitEnabled,
  authorizeGoogleFit,
  syncFromGoogleFit,
  getGoogleFitLastSync,
} from "@/lib/googlefit";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

interface Connection {
  id: string;
  provider: string;
  providerAccountId: string;
  lastSyncedAt: string | null;
  syncEnabled: boolean;
  createdAt: string;
}

export default function IntegrationsScreen() {
  const db = usePowerSync();
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  // HealthKit state (iOS only)
  const [hkAvailable, setHkAvailable] = useState(false);
  const [hkConnected, setHkConnected] = useState(false);
  const [hkLastSync, setHkLastSync] = useState<string | null>(null);
  const [hkLoading, setHkLoading] = useState(false);

  // Google Fit state (Android only)
  const [gfAvailable, setGfAvailable] = useState(false);
  const [gfConnected, setGfConnected] = useState(false);
  const [gfLastSync, setGfLastSync] = useState<string | null>(null);
  const [gfLoading, setGfLoading] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    (async () => {
      const available = await isHealthKitAvailable();
      setHkAvailable(available);
      if (available) {
        const connected = await isHealthKitConnected();
        setHkConnected(connected);
        const ts = await getLastSyncTimestamp();
        setHkLastSync(ts);
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    (async () => {
      const available = isGoogleFitAvailable();
      setGfAvailable(available);
      if (available) {
        const connected = await isGoogleFitConnected();
        setGfConnected(connected);
        const ts = await getGoogleFitLastSync();
        setGfLastSync(ts);
      }
    })();
  }, []);

  const handleHkConnect = async () => {
    setHkLoading(true);
    try {
      const granted = await requestPermissions();
      if (granted) {
        await setHealthKitEnabled(true);
        await syncFromHealthKit(db, user!.id);
        setHkConnected(true);
        setHkLastSync(new Date().toISOString());
      }
    } finally {
      setHkLoading(false);
    }
  };

  const handleHkDisconnect = async () => {
    setHkLoading(true);
    try {
      await setHealthKitEnabled(false);
      setHkConnected(false);
      setHkLastSync(null);
    } finally {
      setHkLoading(false);
    }
  };

  const handleHkSync = async () => {
    setHkLoading(true);
    try {
      await syncFromHealthKit(db, user!.id);
      setHkLastSync(new Date().toISOString());
    } finally {
      setHkLoading(false);
    }
  };

  const handleGfConnect = async () => {
    setGfLoading(true);
    try {
      const authorized = await authorizeGoogleFit();
      if (authorized) {
        await setGoogleFitEnabled(true);
        await syncFromGoogleFit(db, user!.id);
        setGfConnected(true);
        setGfLastSync(new Date().toISOString());
      }
    } finally {
      setGfLoading(false);
    }
  };

  const handleGfDisconnect = async () => {
    setGfLoading(true);
    try {
      await setGoogleFitEnabled(false);
      setGfConnected(false);
      setGfLastSync(null);
    } finally {
      setGfLoading(false);
    }
  };

  const handleGfSync = async () => {
    setGfLoading(true);
    try {
      await syncFromGoogleFit(db, user!.id);
      setGfLastSync(new Date().toISOString());
    } finally {
      setGfLoading(false);
    }
  };

  const fetchConnections = useCallback(async () => {
    try {
      const result = await trpc.integration.listConnections.query();
      setConnections(result as Connection[]);
    } catch {
      // silently fail — user will see empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const stravaConnection = connections.find((c) => c.provider === "strava");
  const garminConnection = connections.find((c) => c.provider === "garmin");
  const intervalsConnection = connections.find((c) => c.provider === "intervals_icu");

  // Intervals.icu: API key + athlete ID (no OAuth — direct credentials)
  const [icuAthleteId, setIcuAthleteId] = useState("");
  const [icuApiKey, setIcuApiKey] = useState("");
  const [icuConnecting, setIcuConnecting] = useState(false);

  const handleIntervalsConnect = async () => {
    if (!icuAthleteId.trim() || !icuApiKey.trim()) return;
    setIcuConnecting(true);
    try {
      await trpc.integration.completeIntervalsIcuAuth.mutate({
        athleteId: icuAthleteId.trim(),
        apiKey: icuApiKey.trim(),
      });
      setIcuAthleteId("");
      setIcuApiKey("");
      await fetchConnections();
    } catch (err: any) {
      Alert.alert("Connection Failed", err?.message ?? "Please check your credentials.");
    } finally {
      setIcuConnecting(false);
    }
  };

  const handleIntervalsDisconnect = async () => {
    setDisconnecting(true);
    try {
      await trpc.integration.disconnectProvider.mutate({ provider: "intervals_icu" });
      await fetchConnections();
    } finally {
      setDisconnecting(false);
    }
  };

  const handleConnect = () => {
    // Open the web OAuth flow in the browser. The web callback handles token
    // exchange. User switches back to the app and the connection appears on
    // next data refresh.
    Linking.openURL(`${API_BASE_URL}/api/strava/connect`);
  };

  const handleGarminConnect = () => {
    Linking.openURL(`${API_BASE_URL}/api/garmin/connect`);
  };

  const handleGarminDisconnect = async () => {
    setDisconnecting(true);
    try {
      await trpc.integration.disconnectProvider.mutate({ provider: "garmin" });
      await fetchConnections();
    } finally {
      setDisconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await trpc.integration.disconnectProvider.mutate({ provider: "strava" });
      await fetchConnections();
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        {loading ? (
          <ActivityIndicator color="hsl(213, 31%, 91%)" />
        ) : (
          <>
          <Card style={{ gap: 12 }}>
            {/* Strava header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Text style={{ fontSize: 20, color: "#FC4C02", fontWeight: "700" }}>
                S
              </Text>
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "hsl(213, 31%, 91%)",
                }}
              >
                Strava
              </Text>
            </View>

            {stravaConnection ? (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#22c55e",
                    }}
                  />
                  <Text style={{ color: "#22c55e", fontWeight: "600" }}>
                    Connected
                  </Text>
                </View>

                {stravaConnection.lastSyncedAt && (
                  <Text
                    style={{
                      color: "hsl(215, 20%, 65%)",
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    Last synced{" "}
                    {new Date(stravaConnection.lastSyncedAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </Text>
                )}

                <Pressable
                  onPress={handleDisconnect}
                  disabled={disconnecting}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: "hsl(0, 63%, 31%)",
                    opacity: disconnecting ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "hsl(210, 40%, 98%)", fontWeight: "600" }}>
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text
                  style={{
                    color: "hsl(215, 20%, 65%)",
                    marginBottom: 12,
                  }}
                >
                  Not connected
                </Text>

                <Pressable
                  onPress={handleConnect}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: "#FC4C02",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Connect
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>

          <Card style={{ gap: 12, marginTop: 16 }}>
            {/* Garmin Connect header */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <Watch size={20} color="#007CC3" />
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "600",
                  color: "hsl(213, 31%, 91%)",
                }}
              >
                Garmin Connect
              </Text>
            </View>

            {garminConnection ? (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 4,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#22c55e",
                    }}
                  />
                  <Text style={{ color: "#22c55e", fontWeight: "600" }}>
                    Connected
                  </Text>
                </View>

                {garminConnection.lastSyncedAt && (
                  <Text
                    style={{
                      color: "hsl(215, 20%, 65%)",
                      fontSize: 12,
                      marginBottom: 12,
                    }}
                  >
                    Last synced{" "}
                    {new Date(garminConnection.lastSyncedAt).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      },
                    )}
                  </Text>
                )}

                <Pressable
                  onPress={handleGarminDisconnect}
                  disabled={disconnecting}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: "hsl(0, 63%, 31%)",
                    opacity: disconnecting ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "hsl(210, 40%, 98%)", fontWeight: "600" }}>
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View>
                <Text
                  style={{
                    color: "hsl(215, 20%, 65%)",
                    marginBottom: 12,
                  }}
                >
                  Not connected
                </Text>

                <Pressable
                  onPress={handleGarminConnect}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: "#007CC3",
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    Connect
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>

          <Card style={{ gap: 12, marginTop: 16 }}>
            {/* Intervals.icu header */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <BarChart3 size={20} color="#FF6B35" />
              <Text style={{ fontSize: 18, fontWeight: "600", color: "hsl(213, 31%, 91%)" }}>
                Intervals.icu
              </Text>
            </View>
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12 }}>
              Sync activities from Garmin, Strava, and other sources via Intervals.icu
            </Text>

            {intervalsConnection ? (
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22c55e" }} />
                  <Text style={{ color: "#22c55e", fontWeight: "600" }}>
                    Connected (athlete {intervalsConnection.providerAccountId})
                  </Text>
                </View>

                {intervalsConnection.lastSyncedAt && (
                  <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12, marginBottom: 12 }}>
                    Last synced{" "}
                    {new Date(intervalsConnection.lastSyncedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                )}

                <Pressable
                  onPress={handleIntervalsDisconnect}
                  disabled={disconnecting}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: "hsl(0, 63%, 31%)",
                    opacity: disconnecting ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "hsl(210, 40%, 98%)", fontWeight: "600" }}>
                    {disconnecting ? "Disconnecting..." : "Disconnect"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <TextInput
                  value={icuAthleteId}
                  onChangeText={setIcuAthleteId}
                  placeholder="Athlete ID (e.g. i12345)"
                  placeholderTextColor="hsl(215, 20%, 45%)"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: "hsl(217, 33%, 12%)",
                    borderWidth: 1,
                    borderColor: "hsl(217, 33%, 20%)",
                    color: "hsl(210, 40%, 98%)",
                    fontSize: 14,
                  }}
                />
                <TextInput
                  value={icuApiKey}
                  onChangeText={setIcuApiKey}
                  placeholder="API Key"
                  placeholderTextColor="hsl(215, 20%, 45%)"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    borderRadius: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    backgroundColor: "hsl(217, 33%, 12%)",
                    borderWidth: 1,
                    borderColor: "hsl(217, 33%, 20%)",
                    color: "hsl(210, 40%, 98%)",
                    fontSize: 14,
                  }}
                />
                <Text style={{ color: "hsl(215, 20%, 55%)", fontSize: 11 }}>
                  Get your athlete ID and API key from intervals.icu → Settings → Developer
                </Text>

                <Pressable
                  onPress={handleIntervalsConnect}
                  disabled={icuConnecting || !icuAthleteId.trim() || !icuApiKey.trim()}
                  style={{
                    paddingVertical: 10,
                    borderRadius: 8,
                    alignItems: "center",
                    backgroundColor: "#FF6B35",
                    opacity: icuConnecting || !icuAthleteId.trim() || !icuApiKey.trim() ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: "#fff", fontWeight: "600" }}>
                    {icuConnecting ? "Connecting..." : "Connect"}
                  </Text>
                </Pressable>
              </View>
            )}
          </Card>

          {Platform.OS === "android" && gfAvailable && (
            <Card style={{ gap: 12, marginTop: 16 }}>
              {/* Google Fit header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Activity size={20} color="#0F9D58" />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "hsl(213, 31%, 91%)",
                  }}
                >
                  Google Fit
                </Text>
              </View>

              {gfConnected ? (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#22c55e",
                      }}
                    />
                    <Text style={{ color: "#22c55e", fontWeight: "600" }}>
                      Connected
                    </Text>
                  </View>

                  {gfLastSync && (
                    <Text
                      style={{
                        color: "hsl(215, 20%, 65%)",
                        fontSize: 12,
                        marginBottom: 12,
                      }}
                    >
                      Last synced{" "}
                      {new Date(gfLastSync).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}

                  <View style={{ gap: 8 }}>
                    <Pressable
                      onPress={handleGfSync}
                      disabled={gfLoading}
                      style={{
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: "hsl(217, 33%, 17%)",
                        opacity: gfLoading ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "hsl(210, 40%, 98%)",
                          fontWeight: "600",
                        }}
                      >
                        {gfLoading ? "Syncing..." : "Sync Now"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleGfDisconnect}
                      disabled={gfLoading}
                      style={{
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: "hsl(0, 63%, 31%)",
                        opacity: gfLoading ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "hsl(210, 40%, 98%)",
                          fontWeight: "600",
                        }}
                      >
                        Disconnect
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <Text
                    style={{
                      color: "hsl(215, 20%, 65%)",
                      marginBottom: 12,
                    }}
                  >
                    Not connected
                  </Text>

                  <Pressable
                    onPress={handleGfConnect}
                    disabled={gfLoading}
                    style={{
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: "#0F9D58",
                      opacity: gfLoading ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      {gfLoading ? "Connecting..." : "Connect"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>
          )}

          {Platform.OS === "ios" && hkAvailable && (
            <Card style={{ gap: 12, marginTop: 16 }}>
              {/* Apple Health header */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <Heart size={20} color="#FF2D55" fill="#FF2D55" />
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "600",
                    color: "hsl(213, 31%, 91%)",
                  }}
                >
                  Apple Health
                </Text>
              </View>

              {hkConnected ? (
                <View>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: "#22c55e",
                      }}
                    />
                    <Text style={{ color: "#22c55e", fontWeight: "600" }}>
                      Connected
                    </Text>
                  </View>

                  {hkLastSync && (
                    <Text
                      style={{
                        color: "hsl(215, 20%, 65%)",
                        fontSize: 12,
                        marginBottom: 12,
                      }}
                    >
                      Last synced{" "}
                      {new Date(hkLastSync).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </Text>
                  )}

                  <View style={{ gap: 8 }}>
                    <Pressable
                      onPress={handleHkSync}
                      disabled={hkLoading}
                      style={{
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: "hsl(217, 33%, 17%)",
                        opacity: hkLoading ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "hsl(210, 40%, 98%)",
                          fontWeight: "600",
                        }}
                      >
                        {hkLoading ? "Syncing..." : "Sync Now"}
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={handleHkDisconnect}
                      disabled={hkLoading}
                      style={{
                        paddingVertical: 10,
                        borderRadius: 8,
                        alignItems: "center",
                        backgroundColor: "hsl(0, 63%, 31%)",
                        opacity: hkLoading ? 0.6 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "hsl(210, 40%, 98%)",
                          fontWeight: "600",
                        }}
                      >
                        Disconnect
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View>
                  <Text
                    style={{
                      color: "hsl(215, 20%, 65%)",
                      marginBottom: 12,
                    }}
                  >
                    Not connected
                  </Text>

                  <Pressable
                    onPress={handleHkConnect}
                    disabled={hkLoading}
                    style={{
                      paddingVertical: 10,
                      borderRadius: 8,
                      alignItems: "center",
                      backgroundColor: "#FF2D55",
                      opacity: hkLoading ? 0.6 : 1,
                    }}
                  >
                    <Text style={{ color: "#fff", fontWeight: "600" }}>
                      {hkLoading ? "Connecting..." : "Connect"}
                    </Text>
                  </Pressable>
                </View>
              )}
            </Card>
          )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
