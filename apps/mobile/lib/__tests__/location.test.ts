import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPlatform, mockPermissionsAndroid, mockSetRNConfiguration, mockWatchPosition, mockClearWatch } =
  vi.hoisted(() => {
    const mockRequest = vi.fn();
    return {
      mockPlatform: { OS: "ios" as "ios" | "android" },
      mockPermissionsAndroid: {
        request: mockRequest,
        PERMISSIONS: { ACCESS_FINE_LOCATION: "android.permission.ACCESS_FINE_LOCATION" },
        RESULTS: { GRANTED: "granted" as const, DENIED: "denied" as const },
      },
      mockSetRNConfiguration: vi.fn(),
      mockWatchPosition: vi.fn(),
      mockClearWatch: vi.fn(),
    };
  });

vi.mock("react-native", () => ({
  Platform: mockPlatform,
  PermissionsAndroid: mockPermissionsAndroid,
}));

vi.mock("@react-native-community/geolocation", () => ({
  default: {
    setRNConfiguration: mockSetRNConfiguration,
    watchPosition: mockWatchPosition,
    clearWatch: mockClearWatch,
  },
}));

import {
  requestForegroundPermissionsAsync,
  requestBackgroundPermissionsAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  Accuracy,
} from "../location";

beforeEach(() => {
  mockPlatform.OS = "ios";
  mockPermissionsAndroid.request.mockReset();
  mockWatchPosition.mockReset();
  mockClearWatch.mockReset();
});

describe("Accuracy enum", () => {
  it("has sequential values 1–6", () => {
    expect(Accuracy.Lowest).toBe(1);
    expect(Accuracy.Low).toBe(2);
    expect(Accuracy.Balanced).toBe(3);
    expect(Accuracy.High).toBe(4);
    expect(Accuracy.Highest).toBe(5);
    expect(Accuracy.BestForNavigation).toBe(6);
  });
});

describe("requestForegroundPermissionsAsync", () => {
  it("returns granted on iOS without querying PermissionsAndroid", async () => {
    mockPlatform.OS = "ios";
    const result = await requestForegroundPermissionsAsync();
    expect(result).toEqual({ status: "granted", granted: true });
    expect(mockPermissionsAndroid.request).not.toHaveBeenCalled();
  });

  it("returns granted when Android grants ACCESS_FINE_LOCATION", async () => {
    mockPlatform.OS = "android";
    mockPermissionsAndroid.request.mockResolvedValue("granted");
    const result = await requestForegroundPermissionsAsync();
    expect(result).toEqual({ status: "granted", granted: true });
    expect(mockPermissionsAndroid.request).toHaveBeenCalledWith(
      "android.permission.ACCESS_FINE_LOCATION",
      expect.objectContaining({ title: "Location Permission" }),
    );
  });

  it("returns denied when Android denies ACCESS_FINE_LOCATION", async () => {
    mockPlatform.OS = "android";
    mockPermissionsAndroid.request.mockResolvedValue("denied");
    const result = await requestForegroundPermissionsAsync();
    expect(result).toEqual({ status: "denied", granted: false });
  });

  it("returns denied when PermissionsAndroid.request throws", async () => {
    mockPlatform.OS = "android";
    mockPermissionsAndroid.request.mockRejectedValue(new Error("no permissions api"));
    const result = await requestForegroundPermissionsAsync();
    expect(result).toEqual({ status: "denied", granted: false });
  });
});

describe("requestBackgroundPermissionsAsync", () => {
  it("always returns denied (background location not supported)", async () => {
    const result = await requestBackgroundPermissionsAsync();
    expect(result).toEqual({ status: "denied", granted: false });
  });
});

describe("startLocationUpdatesAsync", () => {
  it("resolves without error (no-op)", async () => {
    await expect(startLocationUpdatesAsync("LOCATION_TASK")).resolves.toBeUndefined();
  });
});

describe("stopLocationUpdatesAsync", () => {
  it("resolves without error (no-op)", async () => {
    await expect(stopLocationUpdatesAsync("LOCATION_TASK")).resolves.toBeUndefined();
  });
});
