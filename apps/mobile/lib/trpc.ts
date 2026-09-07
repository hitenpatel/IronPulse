import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import * as SecureStore from "@/lib/secure-store";
import type { AppRouter } from "@zor/api";

import { getApiUrl } from "./server";

function createClient(url: string) {
  return createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${url}/api/trpc`,
        transformer: superjson,
        headers: async () => {
          const token = await SecureStore.getItemAsync("auth-token");
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    ],
  });
}

// tRPC v11's httpBatchLink only accepts a static `url: string | URL` — it
// can't re-read the active server on every request the way we need for
// runtime server switching (first-launch picker, Settings → Server). So we
// lazily rebuild the underlying client whenever `getApiUrl()` disagrees
// with what we last built one for, and expose it through a Proxy that
// forwards every property access to the current client. Existing call
// sites (`trpc.auth.getSession.query()` etc.) are unaffected.
let builtForUrl = getApiUrl();
let client = createClient(builtForUrl);

function getClient() {
  const url = getApiUrl();
  if (url !== builtForUrl) {
    builtForUrl = url;
    client = createClient(url);
  }
  return client;
}

export const trpc: typeof client = new Proxy({} as typeof client, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient() as object, prop, receiver);
  },
}) as typeof client;

export { TRPCClientError };
