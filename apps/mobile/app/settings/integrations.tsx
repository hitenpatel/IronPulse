import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Stack } from "expo-router";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";

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
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

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

  const handleConnect = () => {
    // Open the web OAuth flow in the browser. The web callback handles token
    // exchange. User switches back to the app and the connection appears on
    // next data refresh.
    Linking.openURL(`${API_BASE_URL}/api/strava/connect`);
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
    <>
      <Stack.Screen options={{ title: "Connected Apps" }} />

      <View style={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator color="hsl(213, 31%, 91%)" />
        ) : (
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
        )}
      </View>
    </>
  );
}
