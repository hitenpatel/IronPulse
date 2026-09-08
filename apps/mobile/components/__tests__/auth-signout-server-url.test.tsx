/**
 * Covers the review finding: signOut() must preserve `server-url`. Today
 * that's true only as a side effect of `auth-token`/`auth-user` living
 * under different keychain services — nothing asserted the invariant
 * directly, so a future edit to signOut() (e.g. "clear everything on sign
 * out") could silently regress it. This pins the exact set of keys
 * signOut() is allowed to delete.
 */
import React from "react";
import { Text } from "react-native";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

jest.mock("@/lib/secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemResult: jest.fn().mockResolvedValue({ status: "absent" }),
}));

jest.mock("@/lib/server", () => ({
  hydrateServerUrl: jest.fn().mockResolvedValue("https://my-instance.example.com"),
}));

jest.mock("@/lib/trpc", () => ({
  trpc: {
    auth: { getSession: { query: jest.fn().mockRejectedValue(new Error("no network in test")) } },
  },
  TRPCClientError: class extends Error {},
}));

jest.mock("@/lib/biometric", () => ({
  isBiometricEnabled: jest.fn().mockResolvedValue(false),
  isBiometricAvailable: jest.fn().mockResolvedValue(false),
  authenticateWithBiometric: jest.fn().mockResolvedValue(true),
  disableBiometric: jest.fn().mockResolvedValue(undefined),
}));

import * as SecureStore from "@/lib/secure-store";
import { disableBiometric } from "@/lib/biometric";
import { AuthProvider, useAuth } from "@/lib/auth";

const mockDeleteItem = SecureStore.deleteItemAsync as jest.Mock;

function SignOutProbe() {
  const { signOut, isLoading } = useAuth();
  if (isLoading) return <Text testID="probe-loading">loading</Text>;
  return (
    <Text testID="probe-sign-out" onPress={() => signOut()}>
      sign out
    </Text>
  );
}

describe("signOut() preserves server-url", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteItem.mockResolvedValue(undefined);
    (disableBiometric as jest.Mock).mockResolvedValue(undefined);
  });

  it("deletes auth-token and auth-user, and never touches server-url", async () => {
    await render(
      <AuthProvider>
        <SignOutProbe />
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId("probe-sign-out")).toBeTruthy());

    await fireEvent.press(screen.getByTestId("probe-sign-out"));

    await waitFor(() => expect(mockDeleteItem).toHaveBeenCalledWith("auth-token"));
    expect(mockDeleteItem).toHaveBeenCalledWith("auth-user");
    expect(mockDeleteItem).not.toHaveBeenCalledWith("server-url");

    // Belt-and-braces: exactly the two expected keys, nothing else.
    const deletedKeys = mockDeleteItem.mock.calls.map((call) => call[0]);
    expect(new Set(deletedKeys)).toEqual(new Set(["auth-token", "auth-user"]));
  });
});
