import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import * as SecureStore from "expo-secure-store";
import type { AppRouter } from "@ironpulse/api";

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
