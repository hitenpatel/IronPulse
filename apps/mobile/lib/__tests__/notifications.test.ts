import { describe, it, expect, vi, beforeEach } from "vitest";
import { Platform } from "react-native";

// Mock expo modules
vi.mock("expo-notifications", () => ({
  getPermissionsAsync: vi.fn(),
  requestPermissionsAsync: vi.fn(),
  getExpoPushTokenAsync: vi.fn(),
  setNotificationChannelAsync: vi.fn(),
  addNotificationResponseReceivedListener: vi.fn(() => ({ remove: vi.fn() })),
  addPushTokenListener: vi.fn(() => ({ remove: vi.fn() })),
  AndroidImportance: { MAX: 5 },
}));

vi.mock("expo-device", () => ({
  isDevice: true,
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import * as ExpoNotifications from "expo-notifications";
import * as Device from "expo-device";
import { registerForPushNotifications } from "../notifications";

const mockGetPerms = vi.mocked(ExpoNotifications.getPermissionsAsync);
const mockRequestPerms = vi.mocked(ExpoNotifications.requestPermissionsAsync);
const mockGetToken = vi.mocked(ExpoNotifications.getExpoPushTokenAsync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerForPushNotifications", () => {
  it("returns null on non-device (simulator)", async () => {
    vi.mocked(Device).isDevice = false;

    const token = await registerForPushNotifications();
    expect(token).toBeNull();
    expect(mockGetPerms).not.toHaveBeenCalled();

    vi.mocked(Device).isDevice = true;
  });

  it("returns token when permissions already granted", async () => {
    mockGetPerms.mockResolvedValue({ status: "granted" } as any);
    mockGetToken.mockResolvedValue({ data: "ExponentPushToken[abc123]" } as any);

    const token = await registerForPushNotifications();

    expect(token).toBe("ExponentPushToken[abc123]");
    expect(mockRequestPerms).not.toHaveBeenCalled();
  });

  it("requests permissions when not yet granted", async () => {
    mockGetPerms.mockResolvedValue({ status: "undetermined" } as any);
    mockRequestPerms.mockResolvedValue({ status: "granted" } as any);
    mockGetToken.mockResolvedValue({ data: "ExponentPushToken[xyz]" } as any);

    const token = await registerForPushNotifications();

    expect(mockRequestPerms).toHaveBeenCalled();
    expect(token).toBe("ExponentPushToken[xyz]");
  });

  it("returns null when permissions denied", async () => {
    mockGetPerms.mockResolvedValue({ status: "undetermined" } as any);
    mockRequestPerms.mockResolvedValue({ status: "denied" } as any);

    const token = await registerForPushNotifications();

    expect(token).toBeNull();
    expect(mockGetToken).not.toHaveBeenCalled();
  });

  it("sets up Android notification channel on Android", async () => {
    vi.mocked(Platform).OS = "android" as any;
    mockGetPerms.mockResolvedValue({ status: "granted" } as any);
    mockGetToken.mockResolvedValue({ data: "ExponentPushToken[droid]" } as any);

    await registerForPushNotifications();

    expect(ExpoNotifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      "default",
      expect.objectContaining({ name: "Default" }),
    );

    vi.mocked(Platform).OS = "ios" as any;
  });
});
