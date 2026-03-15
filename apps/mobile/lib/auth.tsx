import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import * as SecureStore from "expo-secure-store";
import type { SessionUser } from "@ironpulse/shared";
import { trpc } from "./trpc";

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<SessionUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      try {
        const storedToken = await SecureStore.getItemAsync("auth-token");
        const storedUser = await SecureStore.getItemAsync("auth-user");

        if (storedToken && storedUser) {
          const parsedUser = JSON.parse(storedUser) as SessionUser;
          setToken(storedToken);
          setUser(parsedUser);

          try {
            await trpc.auth.getSession.query();
          } catch {
            // Token expired or network unavailable — use stored user optimistically
          }
        }
      } catch {
        // Secure store read failed
      } finally {
        setIsLoading(false);
      }
    }
    restore();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await trpc.auth.mobileSignIn.mutate({ email, password });
    await SecureStore.setItemAsync("auth-token", result.token);
    await SecureStore.setItemAsync("auth-user", JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user as SessionUser);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const result = await trpc.auth.mobileSignUp.mutate({
        name,
        email,
        password,
      });
      await SecureStore.setItemAsync("auth-token", result.token);
      await SecureStore.setItemAsync("auth-user", JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user as SessionUser);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await SecureStore.deleteItemAsync("auth-token");
    await SecureStore.deleteItemAsync("auth-user");
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback(async (updates: Partial<SessionUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      SecureStore.setItemAsync("auth-user", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isLoading, signIn, signUp, signOut, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
