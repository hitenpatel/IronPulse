import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";
import * as SecureStore from "@/lib/secure-store";
import { darkColors, lightColors } from "@/lib/theme";

export type ThemeMode = "system" | "dark" | "light";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "theme-mode";

interface ThemeContextValue {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  colors: typeof darkColors;
  setMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveMode(mode: ThemeMode, system: ResolvedTheme): ResolvedTheme {
  return mode === "system" ? system : mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const stored = await SecureStore.getItemAsync(STORAGE_KEY);
        if (active && (stored === "system" || stored === "dark" || stored === "light")) {
          setModeState(stored);
        }
      } finally {
        if (active) setHydrated(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    await SecureStore.setItemAsync(STORAGE_KEY, next);
  }, []);

  const resolvedTheme: ResolvedTheme = useMemo(() => {
    const system: ResolvedTheme = systemScheme === "light" ? "light" : "dark";
    return resolveMode(mode, system);
  }, [mode, systemScheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedTheme,
      colors: resolvedTheme === "light" ? lightColors : darkColors,
      setMode,
    }),
    [mode, resolvedTheme, setMode],
  );

  // Gate children on hydration so first paint uses the persisted preference,
  // not the dark fallback.
  if (!hydrated) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return ctx;
}

export function useColors() {
  return useTheme().colors;
}

// Exposed for unit tests — pure resolver without the React runtime.
export const __internal = { resolveMode };
