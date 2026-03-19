import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { useEffect } from "react";

/**
 * Listens for notification tap events and navigates to the path specified
 * in the notification's data payload.
 *
 * Supported deep links (sent as `data.path` in the push payload):
 *   ironpulse://workout/active?workoutId=xxx
 *   ironpulse://messages
 *   ironpulse://challenges
 *   ironpulse://coach
 *
 * The notification payload should include:
 *   { "data": { "path": "/workout/active?workoutId=xxx" } }
 */
export function useNotificationDeepLink() {
  const router = useRouter();

  useEffect(() => {
    // Handle notification tap when app is in background or killed
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.path) {
          router.push(data.path as string);
        }
      }
    );

    return () => subscription.remove();
  }, [router]);
}
