// Safe wrapper around expo-notifications. If the native module isn't linked
// (e.g., in the current bare RN build where expo-modules-core isn't wired up),
// every function no-ops instead of crashing the app on startup.

type NotificationResponseLike = {
  notification: { request: { content: { data: unknown } } };
};

export type NotificationSubscription = { remove: () => void };
export type NotificationResponse = NotificationResponseLike;

let ExpoNotifications: typeof import("expo-notifications") | null = null;
let Device: typeof import("expo-device") | null = null;
let available = false;

try {
  ExpoNotifications = require("expo-notifications");
  Device = require("expo-device");
  // Probe a property that requires the native module — if this throws, we stay disabled
  void ExpoNotifications?.getPermissionsAsync;
  available = true;
} catch {
  available = false;
}

const NOOP_SUB: NotificationSubscription = { remove: () => {} };

export function addNotificationResponseReceivedListener(
  listener: (response: NotificationResponseLike) => void,
): NotificationSubscription {
  if (!available || !ExpoNotifications) return NOOP_SUB;
  try {
    return ExpoNotifications.addNotificationResponseReceivedListener(
      listener as (r: import("expo-notifications").NotificationResponse) => void,
    );
  } catch {
    return NOOP_SUB;
  }
}

/**
 * Request push notification permissions and return the Expo push token.
 * Returns null if the native module isn't linked, permissions are denied,
 * or the device is a simulator.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  if (!available || !ExpoNotifications || !Device) return null;
  try {
    if (!Device.isDevice) return null;

    const { status: existing } = await ExpoNotifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await ExpoNotifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") return null;

    if (require("react-native").Platform.OS === "android") {
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
  } catch {
    return null;
  }
}

export function addPushTokenListener(
  listener: (token: string) => void,
): NotificationSubscription {
  if (!available || !ExpoNotifications) return NOOP_SUB;
  try {
    return ExpoNotifications.addPushTokenListener((tokenData) => {
      listener(tokenData.data);
    });
  } catch {
    return NOOP_SUB;
  }
}
