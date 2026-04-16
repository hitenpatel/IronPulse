import * as Notifications from "@/lib/notifications";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect } from "react";
import type { RootStackParamList } from "../App";

/**
 * Listens for notification tap events and navigates to the screen specified
 * in the notification's data payload.
 *
 * Supported deep links (sent as `data.screen` or `data.path` in the push payload):
 *   WorkoutActive with params { workoutId: "xxx" }
 *   Messages
 *   Challenges
 *   Coach
 *
 * The notification payload should include:
 *   { "data": { "screen": "WorkoutActive", "params": { "workoutId": "xxx" } } }
 *   or legacy: { "data": { "path": "/messages" } }
 */

// Map old expo-router paths to React Navigation screen names
const PATH_TO_SCREEN: Record<string, keyof RootStackParamList> = {
  "/messages": "Messages",
  "/challenges": "Challenges",
  "/coach": "Coach",
  "/calendar": "Calendar",
  "/feed": "Feed",
  "/history/workouts": "HistoryWorkouts",
  "/history/cardio": "HistoryCardio",
};

export function useNotificationDeepLink() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Handle notification tap when app is in background or killed
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        // New format: { screen, params }
        if (data?.screen) {
          navigation.navigate(data.screen as any, data.params as any);
          return;
        }

        // Legacy format: { path }
        if (data?.path) {
          const path = data.path as string;

          // Check for parameterized paths like /workout/active?workoutId=xxx
          if (path.startsWith("/workout/active")) {
            const url = new URL(`ironpulse://${path}`);
            const workoutId = url.searchParams.get("workoutId") ?? "";
            navigation.navigate("WorkoutActive", { workoutId });
            return;
          }

          // Direct path mapping
          const screenName = PATH_TO_SCREEN[path];
          if (screenName) {
            navigation.navigate(screenName as any);
          }
        }
      }
    );

    return () => subscription.remove();
  }, [navigation]);
}
