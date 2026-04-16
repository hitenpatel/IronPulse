import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import * as SecureStore from "@/lib/secure-store";
import type { AppRouter } from "@ironpulse/api";

import { Config } from "./config";

const API_URL = Config.API_URL;

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
