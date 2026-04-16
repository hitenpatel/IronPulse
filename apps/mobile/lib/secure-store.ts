/**
 * Drop-in replacement for expo-secure-store using react-native-keychain.
 *
 * Provides the same API: getItemAsync, setItemAsync, deleteItemAsync.
 * All values are stored in the device's secure keychain/keystore.
 */
import * as Keychain from "react-native-keychain";

const SERVICE_PREFIX = "ironpulse_";

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    const result = await Keychain.getGenericPassword({ service: SERVICE_PREFIX + key });
    if (result && result.password) {
      return result.password;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(key, value, { service: SERVICE_PREFIX + key });
}

export async function deleteItemAsync(key: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_PREFIX + key });
}
