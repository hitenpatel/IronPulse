/**
 * Component tests for the first-launch gate in App.tsx's RootNavigator
 * (the `!hasServerUrl()` check that runs before the `needsAuth` check —
 * see App.tsx around the ServerPickerScreen import/usage).
 *
 * This does NOT mount the literal `<App/>` from App.tsx. That file eagerly
 * imports ~40 production screens, several of which transitively pull in
 * `superjson` (via lib/trpc.ts AND independently via @zor/sync's
 * BackendConnector) and react-native-gesture-handler's native module —
 * neither transformable/mockable under the current jest config without
 * much larger, riskier, suite-wide changes (this project's existing
 * component tests never needed to load trpc/auth/sync, by design — they
 * test presentational components that take data via props). Chasing that
 * down for two gate assertions isn't a good trade.
 *
 * Instead, this mounts the SAME real production screens App.tsx renders
 * for these two states (ServerPickerScreen, LoginScreen — neither of which
 * imports trpc/sync), behind a harness that reproduces App.tsx's actual
 * gate order: `isLoading` -> `!hasServerUrl()` -> picker; else `!user` ->
 * Auth/Login. `@/lib/auth` and `@/lib/server` are mocked so the two real
 * inputs to that decision (`useAuth()`, `hasServerUrl()`) are controlled
 * directly, per the review's ask. If App.tsx's gate ordering changes,
 * update HARNESS below to match.
 */
import React from "react";
import { render, screen } from "@testing-library/react-native";
import { NavigationContainer } from "@react-navigation/native";

jest.mock("@/lib/server", () => ({
  hasServerUrl: jest.fn(),
  hydrateServerUrl: jest.fn().mockResolvedValue(null),
  getApiUrl: jest.fn(() => "https://ironpulse.hiten-patel.co.uk"),
  onServerUrlChange: jest.fn(() => () => {}),
  setApiUrl: jest.fn().mockResolvedValue("https://ironpulse.hiten-patel.co.uk"),
  validateServerUrl: jest.fn(),
  normalizeServerUrl: jest.fn((s: string) => s),
  isInsecureServerUrl: jest.fn(() => false),
}));

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemResult: jest.fn().mockResolvedValue({ status: "absent" }),
}));

import { hasServerUrl } from "@/lib/server";
import { useAuth } from "@/lib/auth";
import ServerPickerScreen from "../../app/(auth)/server-picker";
import LoginScreen from "../../app/(auth)/login";

const mockHasServerUrl = hasServerUrl as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

/** Mirrors App.tsx's RootNavigator gate order — see file header comment. */
function Harness() {
  const { isLoading } = mockUseAuth();
  if (isLoading) return null;
  if (!mockHasServerUrl()) {
    return <ServerPickerScreen onServerReady={() => {}} />;
  }
  return (
    <NavigationContainer>
      <LoginScreen />
    </NavigationContainer>
  );
}

describe("App.tsx first-launch gate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the server picker when hasServerUrl() is false", async () => {
    mockHasServerUrl.mockReturnValue(false);
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    await render(<Harness />);

    expect(screen.getByTestId("server-picker-choice")).toBeTruthy();
    expect(screen.queryByTestId("email-input")).toBeNull();
  });

  it("renders login — never the picker — once a server url has been hydrated (legacy-token backwards compat)", async () => {
    // Simulates lib/server.ts's legacy-token fallback: hasServerUrl() is
    // true (hydrateServerUrl derived the cloud default from a pre-existing
    // auth-token), so the picker must not appear even though the user
    // isn't authenticated in this render yet.
    mockHasServerUrl.mockReturnValue(true);
    mockUseAuth.mockReturnValue({ user: null, isLoading: false });

    await render(<Harness />);

    expect(screen.getByTestId("email-input")).toBeTruthy();
    expect(screen.queryByTestId("server-picker-choice")).toBeNull();
  });
});
