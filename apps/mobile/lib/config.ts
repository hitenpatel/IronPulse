/**
 * App configuration — reads from process.env at bundle time.
 *
 * Set via shell environment before starting Metro:
 *   API_URL=http://192.168.1.196:3000 npx react-native start
 *
 * Falls back to Expo-style env vars for backward compatibility,
 * then to sensible defaults.
 *
 * DEFAULT_API_URL is only the *fallback* server — the managed cloud
 * instance. The server a running app actually talks to is resolved at
 * runtime via `getApiUrl()` in `@/lib/server`, which layers a user-picked
 * (or SecureStore-persisted) server URL on top of this default. Do not
 * read this value directly for API calls — use `getApiUrl()` instead.
 */
export const Config = {
  DEFAULT_API_URL:
    process.env.API_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    "https://ironpulse.hiten-patel.co.uk",

  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
    "",

  E2E: (process.env.E2E ?? process.env.EXPO_PUBLIC_E2E) === "1",
};
