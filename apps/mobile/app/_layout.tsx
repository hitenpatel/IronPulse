import "../global.css";
import { useEffect } from "react";
import { Slot, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PowerSyncContext } from "@powersync/react";
import { AuthProvider, useAuth } from "@/lib/auth";
import {
  getPowerSyncDatabase,
  createMobileConnector,
} from "@/lib/powersync";
import { syncFromHealthKit, isHealthKitConnected } from "@/lib/healthkit";

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const db = getPowerSyncDatabase();

  useEffect(() => {
    if (user) {
      const connector = createMobileConnector();
      db.connect(connector);
      isHealthKitConnected().then((connected) => {
        if (connected) {
          syncFromHealthKit(db, user.id).catch((err) =>
            console.error("HealthKit sync error:", err)
          );
        }
      });
    } else {
      db.disconnect();
    }
  }, [user]);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "hsl(224, 71%, 4%)",
        }}
      >
        <ActivityIndicator color="hsl(210, 40%, 98%)" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <PowerSyncContext.Provider value={db}>
      <Slot />
    </PowerSyncContext.Provider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
