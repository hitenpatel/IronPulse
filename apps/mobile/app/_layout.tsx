import "../global.css";
import { useEffect } from "react";
import { Slot, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PowerSyncContext } from "@powersync/react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { AuthProvider, useAuth } from "@/lib/auth";
import {
  getPowerSyncDatabase,
  createMobileConnector,
} from "@/lib/powersync";
import { syncFromHealthKit, isHealthKitConnected } from "@/lib/healthkit";
import { syncFromGoogleFit, isGoogleFitConnected } from "@/lib/googlefit";
import { trpc } from "@/lib/trpc";

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const db = getPowerSyncDatabase();

  useEffect(() => {
    if (user) {
      const connector = createMobileConnector();
      db.connect(connector);

      // Register push notifications
      if (Device.isDevice) {
        Notifications.requestPermissionsAsync().then(({ status }) => {
          if (status === "granted") {
            Notifications.getExpoPushTokenAsync().then(({ data: token }) => {
              trpc.user.registerPushToken
                .mutate({ token, platform: Platform.OS })
                .catch(() => {});
            });
          }
        });
      }

      isHealthKitConnected().then((connected) => {
        if (connected) {
          syncFromHealthKit(db, user.id).catch((err) =>
            console.error("HealthKit sync error:", err)
          );
        }
      });
      isGoogleFitConnected().then((connected) => {
        if (connected) {
          syncFromGoogleFit(db, user.id).catch((err) =>
            console.error("Google Fit sync error:", err)
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
