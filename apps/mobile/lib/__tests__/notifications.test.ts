import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// notifications.ts uses top-level `require("expo-notifications")` and
// `require("react-native").Platform.OS` behind an availability guard that
// returns null when the native modules aren't linked. Under Node the guard
// naturally trips (no global `require` in ESM, no native modules), so tests
// stub a global `require` that returns fake modules before dynamically
// importing notifications for each test.

type PermissionStatus = "granted" | "denied" | "undetermined";

interface Fakes {
  expoNotifications: {
    getPermissionsAsync: ReturnType<typeof vi.fn>;
    requestPermissionsAsync: ReturnType<typeof vi.fn>;
    getExpoPushTokenAsync: ReturnType<typeof vi.fn>;
    setNotificationChannelAsync: ReturnType<typeof vi.fn>;
    addNotificationResponseReceivedListener: ReturnType<typeof vi.fn>;
    addPushTokenListener: ReturnType<typeof vi.fn>;
    AndroidImportance: { MAX: number };
  };
  expoDevice: { isDevice: boolean };
  reactNative: { Platform: { OS: "ios" | "android" } };
}

function makeFakes(overrides: {
  isDevice?: boolean;
  os?: "ios" | "android";
  permission?: PermissionStatus;
  requestedPermission?: PermissionStatus;
  token?: string;
} = {}): Fakes {
  const permission = overrides.permission ?? "granted";
  const requestedPermission = overrides.requestedPermission ?? permission;
  return {
    expoNotifications: {
      getPermissionsAsync: vi.fn().mockResolvedValue({ status: permission }),
      requestPermissionsAsync: vi
        .fn()
        .mockResolvedValue({ status: requestedPermission }),
      getExpoPushTokenAsync: vi
        .fn()
        .mockResolvedValue({ data: overrides.token ?? "ExponentPushToken[abc]" }),
      setNotificationChannelAsync: vi.fn().mockResolvedValue(undefined),
      addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
      addPushTokenListener: vi.fn(() => ({ remove: vi.fn() })),
      AndroidImportance: { MAX: 5 },
    },
    expoDevice: { isDevice: overrides.isDevice ?? true },
    reactNative: { Platform: { OS: overrides.os ?? "ios" } },
  };
}

function installRequireStub(fakes: Fakes) {
  vi.stubGlobal("require", (id: string) => {
    if (id === "expo-notifications") return fakes.expoNotifications;
    if (id === "expo-device") return fakes.expoDevice;
    if (id === "react-native") return fakes.reactNative;
    throw new Error(`unexpected require in test: ${id}`);
  });
}

async function loadNotifications() {
  vi.resetModules();
  return import("../notifications");
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registerForPushNotifications", () => {
  it("returns null on non-device (simulator)", async () => {
    const fakes = makeFakes({ isDevice: false });
    installRequireStub(fakes);
    const { registerForPushNotifications } = await loadNotifications();

    const token = await registerForPushNotifications();

    expect(token).toBeNull();
    expect(fakes.expoNotifications.getPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns token when permissions already granted", async () => {
    const fakes = makeFakes({ permission: "granted", token: "ExponentPushToken[abc123]" });
    installRequireStub(fakes);
    const { registerForPushNotifications } = await loadNotifications();

    const token = await registerForPushNotifications();

    expect(token).toBe("ExponentPushToken[abc123]");
    expect(fakes.expoNotifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("requests permissions when not yet granted", async () => {
    const fakes = makeFakes({
      permission: "undetermined",
      requestedPermission: "granted",
      token: "ExponentPushToken[xyz]",
    });
    installRequireStub(fakes);
    const { registerForPushNotifications } = await loadNotifications();

    const token = await registerForPushNotifications();

    expect(fakes.expoNotifications.requestPermissionsAsync).toHaveBeenCalled();
    expect(token).toBe("ExponentPushToken[xyz]");
  });

  it("returns null when permissions denied", async () => {
    const fakes = makeFakes({
      permission: "undetermined",
      requestedPermission: "denied",
    });
    installRequireStub(fakes);
    const { registerForPushNotifications } = await loadNotifications();

    const token = await registerForPushNotifications();

    expect(token).toBeNull();
    expect(fakes.expoNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it("sets up Android notification channel on Android", async () => {
    const fakes = makeFakes({
      os: "android",
      permission: "granted",
      token: "ExponentPushToken[droid]",
    });
    installRequireStub(fakes);
    const { registerForPushNotifications } = await loadNotifications();

    await registerForPushNotifications();

    expect(
      fakes.expoNotifications.setNotificationChannelAsync,
    ).toHaveBeenCalledWith(
      "default",
      expect.objectContaining({ name: "Default" }),
    );
  });
});
