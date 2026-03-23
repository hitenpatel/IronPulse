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
import { isBiometricEnabled, isBiometricAvailable, authenticateWithBiometric, disableBiometric } from "./biometric";

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithBiometric: () => Promise<boolean>;
  signInWithOAuth: (provider: "google" | "apple", idToken: string, name?: string, email?: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<SessionUser>) => Promise<void>;
  showBiometricPrompt: boolean;
  dismissBiometricPrompt: () => void;
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
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  useEffect(() => {
    async function restore() {
      try {
        const storedToken = await SecureStore.getItemAsync("auth-token");
        const storedUser = await SecureStore.getItemAsync("auth-user");

        if (storedToken && storedUser) {
          // Check if biometric unlock is required
          const bioEnabled = await isBiometricEnabled();
          const bioAvailable = await isBiometricAvailable();

          if (bioEnabled && bioAvailable) {
            const success = await authenticateWithBiometric();

            if (!success) {
              // Biometric + passcode both failed — don't restore session, show login
              setIsLoading(false);
              return;
            }
          } else if (bioEnabled && !bioAvailable) {
            // User disabled biometrics in OS settings — skip gate, session still valid
          }

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
    let result: any;
    try {
      result = await trpc.auth.mobileSignIn.mutate({ email, password });
    } catch (tRPCErr) {
      // Fallback: direct fetch (works when tRPC fails on Hermes due to URL polyfill issues)
      const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";
      const resp = await fetch(`${apiUrl}/api/trpc/auth.mobileSignIn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email, password } }),
      });
      if (!resp.ok) throw new Error(`Login failed: HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.error) throw new Error(data.error.json?.message || "Login failed");
      result = data.result?.data?.json;
      if (!result?.token) throw new Error("No token in response");
    }
    await SecureStore.setItemAsync("auth-token", result.token);
    await SecureStore.setItemAsync("auth-user", JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user as SessionUser);
    // Check if we should offer biometric enrollment
    const bioAvailable = await isBiometricAvailable();
    const bioEnabled = await isBiometricEnabled();
    if (bioAvailable && !bioEnabled) {
      setShowBiometricPrompt(true);
    }
  }, []);

  const signInWithBiometric = useCallback(async (): Promise<boolean> => {
    const storedToken = await SecureStore.getItemAsync("auth-token");
    const storedUser = await SecureStore.getItemAsync("auth-user");
    if (!storedToken || !storedUser) return false;

    const success = await authenticateWithBiometric();
    if (!success) return false;

    const parsedUser = JSON.parse(storedUser) as SessionUser;
    setToken(storedToken);
    setUser(parsedUser);
    return true;
  }, []);

  const signInWithOAuth = useCallback(
    async (provider: "google" | "apple", idToken: string, name?: string, email?: string) => {
      const result = await trpc.auth.mobileOAuthSignIn.mutate({
        provider,
        idToken,
        name,
        email,
      });
      await SecureStore.setItemAsync("auth-token", result.token);
      await SecureStore.setItemAsync("auth-user", JSON.stringify(result.user));
      setToken(result.token);
      setUser(result.user as SessionUser);
    },
    [],
  );

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
    await disableBiometric();
    await SecureStore.deleteItemAsync("auth-token");
    await SecureStore.deleteItemAsync("auth-user");
    setToken(null);
    setUser(null);
  }, []);

  const dismissBiometricPrompt = useCallback(() => {
    setShowBiometricPrompt(false);
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
      value={{ user, token, isLoading, signIn, signInWithBiometric, signInWithOAuth, signUp, signOut, updateUser, showBiometricPrompt, dismissBiometricPrompt }}
    >
      {children}
    </AuthContext.Provider>
  );
}
