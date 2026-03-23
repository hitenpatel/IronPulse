import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import * as SecureStore from "expo-secure-store";
import type { AppRouter } from "@ironpulse/api";

// Polyfill URL for Hermes if RN's polyfills haven't set it up yet
if (typeof globalThis.URL === "undefined") {
  try {
    globalThis.URL = require("react-native/Libraries/Blob/URL").URL;
  } catch {
    // Minimal fallback
    globalThis.URL = function(u: string) { this.href = u; this.toString = () => u; } as any;
  }
}

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_URL}/api/trpc`,
      transformer: superjson,
      headers: async () => {
        const token = await SecureStore.getItemAsync("auth-token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
