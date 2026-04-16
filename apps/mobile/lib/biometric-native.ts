/**
 * Drop-in replacement for expo-local-authentication.
 *
 * Currently returns stub/success values. Replace the implementations with
 * react-native-biometrics once that native module is linked.
 */

export enum AuthenticationType {
  FINGERPRINT = 1,
  FACIAL_RECOGNITION = 2,
  IRIS = 3,
}

export interface AuthenticateResult {
  success: boolean;
  error?: string;
  warning?: string;
}

export interface AuthenticateOptions {
  promptMessage?: string;
  fallbackLabel?: string;
  cancelLabel?: string;
  disableDeviceFallback?: boolean;
  requireConfirmation?: boolean;
}

export async function hasHardwareAsync(): Promise<boolean> {
  // Stub: assume hardware is available
  return true;
}

export async function isEnrolledAsync(): Promise<boolean> {
  // Stub: assume enrolled
  return true;
}

export async function supportedAuthenticationTypesAsync(): Promise<
  AuthenticationType[]
> {
  // Stub: return fingerprint as default
  return [AuthenticationType.FINGERPRINT];
}

export async function authenticateAsync(
  _options?: AuthenticateOptions,
): Promise<AuthenticateResult> {
  // Stub: always succeed — replace with react-native-biometrics
  return { success: true };
}
