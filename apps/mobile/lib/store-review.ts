/**
 * Drop-in replacement for expo-store-review.
 *
 * No-op stubs. Replace with react-native-rate or react-native-in-app-review
 * when a native module is linked.
 */

export async function isAvailableAsync(): Promise<boolean> {
  return false;
}

export async function requestReview(): Promise<void> {
  // No-op
}
