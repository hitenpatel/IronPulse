/**
 * Drop-in replacement for expo-notifications.
 *
 * No-op stubs that match the API surface used in useNotificationDeepLink.ts.
 * Replace with @notifee/react-native or react-native-push-notification later.
 */

export interface NotificationSubscription {
  remove(): void;
}

export interface NotificationResponse {
  notification: {
    request: {
      content: {
        data: Record<string, any>;
      };
    };
  };
  actionIdentifier: string;
}

export function addNotificationResponseReceivedListener(
  _listener: (response: NotificationResponse) => void,
): NotificationSubscription {
  // No-op — no native notification module linked
  return { remove: () => {} };
}
