try { require("../global.css"); } catch {}
import { useEffect } from "react";
import { Slot, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
let PowerSyncContext: any;
try { PowerSyncContext = require("@powersync/react").PowerSyncContext; } catch {}
let Notifications: any;
let Device: any;
try { Notifications = require("expo-notifications"); Device = require("expo-device"); } catch {}
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
      if (Device?.isDevice && Notifications) {
        Notifications.requestPermissionsAsync().then(({ status }: any) => {
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

  if (PowerSyncContext) {
    return (
      <PowerSyncContext.Provider value={db}>
        <Slot />
      </PowerSyncContext.Provider>
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
