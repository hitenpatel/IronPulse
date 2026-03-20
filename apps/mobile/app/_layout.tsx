import "../global.css";
import { useEffect, useState } from "react";
import { Slot, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { useNotificationDeepLink } from "@/lib/useNotificationDeepLink";

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [powersyncReady, setPowersyncReady] = useState(false);
  useNotificationDeepLink();
  const [PowerSyncProvider, setPowerSyncProvider] = useState<any>(null);
  const [db, setDb] = useState<any>(null);

  // Initialize PowerSync lazily after first render
  useEffect(() => {
    (async () => {
      try {
        const { getPowerSyncDatabase, createMobileConnector } = await import("@/lib/powersync");
        const { PowerSyncContext } = await import("@powersync/react");
        const database = getPowerSyncDatabase();
        setDb(database);
        setPowerSyncProvider(() => PowerSyncContext?.Provider);
        setPowersyncReady(true);
      } catch (err) {
        console.warn("PowerSync init failed:", err);
        setPowersyncReady(true); // Continue without PowerSync
      }
    })();
  }, []);

  // Connect/disconnect PowerSync based on auth state
  useEffect(() => {
    if (!db || !powersyncReady) return;
    if (user) {
      try {
        const { createMobileConnector } = require("@/lib/powersync");
        const connector = createMobileConnector();
        db.connect(connector);
      } catch {}

      // Push notifications (best-effort)
      (async () => {
        try {
          const Device = require("expo-device");
          const Notifications = require("expo-notifications");
          if (Device.isDevice) {
            const { status } = await Notifications.requestPermissionsAsync();
            if (status === "granted") {
              const { data: token } = await Notifications.getExpoPushTokenAsync();
              trpc.user.registerPushToken.mutate({ token, platform: Platform.OS }).catch(() => {});
            }
          }
        } catch {}
      })();

      // HealthKit / Google Fit sync (best-effort)
      (async () => {
        try {
          const { isHealthKitConnected, syncFromHealthKit } = require("@/lib/healthkit");
          if (await isHealthKitConnected()) {
            await syncFromHealthKit(db, user.id);
          }
        } catch {}
        try {
          const { isGoogleFitConnected, syncFromGoogleFit } = require("@/lib/googlefit");
          if (await isGoogleFitConnected()) {
            await syncFromGoogleFit(db, user.id);
          }
        } catch {}
      })();
    }
  }, [user, db, powersyncReady]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "hsl(224, 71%, 4%)" }}>
        <ActivityIndicator color="hsl(210, 40%, 98%)" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.onboardingComplete === false) {
    return <Redirect href="/(auth)/onboarding" />;
  }

  // Wrap in PowerSync provider if available
  if (PowerSyncProvider && db) {
    return (
      <PowerSyncProvider value={db}>
        <Slot />
      </PowerSyncProvider>
    );
  }

  return <Slot />;
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
