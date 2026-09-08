/**
 * Covers the review finding on app/settings/server.tsx's change-server
 * ordering: signOut() and setApiUrl() can genuinely reject (unlike
 * clearPowerSyncCache(), which swallows its own errors internally — see
 * lib/powersync.ts), so the destructive step (wiping the local PowerSync
 * cache) must run LAST, only once both prior steps have actually
 * succeeded. If signOut() rejects, nothing else should run at all — the
 * old session and old server's local cache must both still be intact so
 * the user can simply retry instead of being stranded.
 */
import React from "react";
import { Alert } from "react-native";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react-native";

jest.mock("@/lib/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/powersync", () => ({
  clearPowerSyncCache: jest.fn(),
}));

jest.mock("@/lib/server", () => ({
  getApiUrl: jest.fn(() => "https://old.example.com"),
  setApiUrl: jest.fn(),
  validateServerUrl: jest.fn(),
}));

import { useAuth } from "@/lib/auth";
import { clearPowerSyncCache } from "@/lib/powersync";
import { setApiUrl, validateServerUrl } from "@/lib/server";
import SettingsServerScreen from "../../app/settings/server";

const mockUseAuth = useAuth as jest.Mock;
const mockClearCache = clearPowerSyncCache as jest.Mock;
const mockSetApiUrl = setApiUrl as jest.Mock;
const mockValidate = validateServerUrl as jest.Mock;

function mockAlertInvokingDestructiveButton() {
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    const destructive = buttons?.find((b) => b.style === "destructive");
    destructive?.onPress?.();
  });
}

async function changeServerTo(newUrl: string) {
  // RTL 14's fireEvent.press/changeText are async — must be awaited
  // directly (not wrapped in act()) or the underlying state update never
  // flushes before the next line reads it.
  await fireEvent.changeText(screen.getByTestId("settings-server-url-input"), newUrl);
  await fireEvent.press(screen.getByTestId("settings-server-change-button"));
  await waitFor(() => expect(validateServerUrl).toHaveBeenCalled());
}

describe("Settings → Server change ordering", () => {
  let signOutMock: jest.Mock;
  let order: string[];

  afterEach(cleanup);

  beforeEach(() => {
    jest.clearAllMocks();
    order = [];
    signOutMock = jest.fn().mockImplementation(async () => {
      order.push("signOut");
    });
    mockUseAuth.mockReturnValue({ signOut: signOutMock });
    mockSetApiUrl.mockImplementation(async (url: string) => {
      order.push("setApiUrl");
      return url;
    });
    mockClearCache.mockImplementation(async () => {
      order.push("clearPowerSyncCache");
    });
    mockValidate.mockResolvedValue({ ok: true, url: "https://new.example.com" });
    mockAlertInvokingDestructiveButton();
  });

  it("runs signOut, then setApiUrl, then clearPowerSyncCache — cache cleared last", async () => {
    await render(<SettingsServerScreen />);

    await changeServerTo("new.example.com");

    await waitFor(() => expect(order).toEqual(["signOut", "setApiUrl", "clearPowerSyncCache"]));
  });

  it("if signOut() rejects, neither setApiUrl nor clearPowerSyncCache run — nothing destructive happens", async () => {
    signOutMock.mockRejectedValue(new Error("keychain write failed"));
    const alertSpy = jest.spyOn(Alert, "alert");

    await render(<SettingsServerScreen />);

    await changeServerTo("new.example.com");

    await waitFor(() => expect(signOutMock).toHaveBeenCalledTimes(1));

    expect(mockSetApiUrl).not.toHaveBeenCalled();
    expect(mockClearCache).not.toHaveBeenCalled();
    // Second alert call is the "Failed to switch servers" error notice
    // fired from the catch block, distinct from the confirmation dialog.
    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Failed to switch servers. Please try again.",
    );
  });

  it("if setApiUrl() rejects after signOut() succeeds, the cache is never cleared", async () => {
    mockSetApiUrl.mockRejectedValue(new Error("secure store write failed"));
    const alertSpy = jest.spyOn(Alert, "alert");

    await render(<SettingsServerScreen />);

    await changeServerTo("new.example.com");

    await waitFor(() => expect(mockSetApiUrl).toHaveBeenCalledTimes(1));

    expect(mockClearCache).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith(
      "Error",
      "Failed to switch servers. Please try again.",
    );
  });
});
