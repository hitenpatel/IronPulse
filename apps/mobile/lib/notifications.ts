import * as ExpoNotifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

// Re-export types that useNotificationDeepLink expects
export type NotificationSubscription =
  ExpoNotifications.Subscription;

export type NotificationResponse =
  ExpoNotifications.NotificationResponse;

export const addNotificationResponseReceivedListener =
  ExpoNotifications.addNotificationResponseReceivedListener;

/**
 * Request push notification permissions and return the Expo push token.
 * Returns null if permissions are denied or the device is a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existing } =
    await ExpoNotifications.getPermissionsAsync();

  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await ExpoNotifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await ExpoNotifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: ExpoNotifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await ExpoNotifications.getExpoPushTokenAsync({
    projectId: "a4541ea9-4c09-42bf-8ae6-f12a5ebb81e3",
  });

  return tokenData.data;
}

/**
 * Listen for push token changes (e.g., after token refresh).
 */
export function addPushTokenListener(
  listener: (token: string) => void,
): ExpoNotifications.Subscription {
  return ExpoNotifications.addPushTokenListener((tokenData) => {
    listener(tokenData.data);
  });
}
