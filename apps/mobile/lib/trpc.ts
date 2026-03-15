import { createTRPCClient, httpBatchLink, TRPCClientError } from "@trpc/client";
import superjson from "superjson";
import * as SecureStore from "expo-secure-store";
import type { AppRouter } from "@ironpulse/api";
import { observable } from "@trpc/server/observable";
import type { TRPCLink } from "@trpc/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// Intercept 401 responses to clear expired auth tokens
const authInterceptLink: TRPCLink<AppRouter> = () => {
  return ({ next, op }) => {
    return observable((observer) => {
      const unsubscribe = next(op).subscribe({
        next: observer.next,
        error: async (err) => {
          if (
            err instanceof TRPCClientError &&
            err.data?.code === "UNAUTHORIZED"
          ) {
            await SecureStore.deleteItemAsync("auth-token");
            await SecureStore.deleteItemAsync("auth-user");
          }
          observer.error(err);
        },
        complete: observer.complete,
      });
      return unsubscribe;
    });
  };
};

export const trpc = createTRPCClient<AppRouter>({
  links: [
    authInterceptLink,
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
