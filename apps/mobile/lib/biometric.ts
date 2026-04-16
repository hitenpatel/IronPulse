import * as LocalAuthentication from "@/lib/biometric-native";
import * as SecureStore from "@/lib/secure-store";

const BIOMETRIC_ENABLED_KEY = "biometric-enabled";

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;

  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  return isEnrolled;
}

export async function getBiometricLabel(): Promise<string> {
  const types =
    await LocalAuthentication.supportedAuthenticationTypesAsync();

  if (
    types.includes(
      LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
    )
  ) {
    return "Face ID";
  }
  if (
    types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
  ) {
    return "Touch ID";
  }
  return "Biometric";
}

export async function isBiometricEnabled(): Promise<boolean> {
  const value = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
  return value === "true";
}

export async function enableBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Verify to enable biometric unlock",
    fallbackLabel: "Use Passcode",
  });

  if (result.success) {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, "true");
    return true;
  }

  return false;
}

export async function disableBiometric(): Promise<void> {
  await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
}

export async function authenticateWithBiometric(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock IronPulse",
    fallbackLabel: "Use Passcode",
    cancelLabel: "Sign In Instead",
  });

  return result.success;
}
