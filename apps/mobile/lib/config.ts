/**
 * App configuration — reads from process.env at bundle time.
 *
 * Set via shell environment before starting Metro:
 *   API_URL=http://192.168.1.196:3000 npx react-native start
 *
 * Falls back to Expo-style env vars for backward compatibility,
 * then to sensible defaults.
 */
export const Config = {
  API_URL:
    process.env.API_URL ??
    process.env.EXPO_PUBLIC_API_URL ??
    "https://ironpulse.hiten-patel.co.uk",

  GOOGLE_CLIENT_ID:
    process.env.GOOGLE_CLIENT_ID ??
    process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ??
    "",

  E2E: (process.env.E2E ?? process.env.EXPO_PUBLIC_E2E) === "1",
};
