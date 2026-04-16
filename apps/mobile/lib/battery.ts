/**
 * Drop-in replacement for expo-battery.
 *
 * Returns a stub value of 1.0 (full battery). Battery level is non-critical
 * and only used for a low-battery warning banner during cardio tracking.
 *
 * Can be replaced with react-native-device-info's getBatteryLevel() later.
 */

export async function getBatteryLevelAsync(): Promise<number> {
  return 1.0;
}
