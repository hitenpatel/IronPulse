/**
 * Drop-in replacement for expo-secure-store using react-native-keychain.
 *
 * Provides the same API: getItemAsync, setItemAsync, deleteItemAsync.
 * All values are stored in the device's secure keychain/keystore.
 */
import * as Keychain from "react-native-keychain";

const SERVICE_PREFIX = "zor_";

/**
 * Discriminated read result — lets callers that need to tell "nothing was
 * ever written here" apart from "the keychain couldn't be read right now"
 * do so. `getItemAsync` below collapses both into `null` for callers that
 * don't care about the distinction; anything that would behave differently
 * on a transient read failure (e.g. `lib/server.ts`'s legacy-cloud
 * migration) must use `getItemResult` instead.
 */
export type SecureReadResult =
  | { status: "found"; value: string }
  | { status: "absent" }
  | { status: "error"; error: unknown };

export async function getItemResult(key: string): Promise<SecureReadResult> {
  try {
    const result = await Keychain.getGenericPassword({ service: SERVICE_PREFIX + key });
    if (result && result.password) {
      return { status: "found", value: result.password };
    }
    return { status: "absent" };
  } catch (error) {
    return { status: "error", error };
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  const result = await getItemResult(key);
  return result.status === "found" ? result.value : null;
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(key, value, { service: SERVICE_PREFIX + key });
}

export async function deleteItemAsync(key: string): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_PREFIX + key });
}
