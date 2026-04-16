/**
 * Location module — wraps @react-native-community/geolocation
 * Uses Android's built-in LocationManager (no Google Play Services required).
 */
import { PermissionsAndroid, Platform } from "react-native";

let Geolocation: any = null;
try {
  Geolocation = require("@react-native-community/geolocation").default;
  // Configure to use Android framework location
  Geolocation.setRNConfiguration({
    skipPermissionRequests: false,
    authorizationLevel: "whenInUse",
    enableBackgroundLocationUpdates: false,
    locationProvider: "android",
  });
} catch {}

export enum Accuracy {
  Lowest = 1,
  Low = 2,
  Balanced = 3,
  High = 4,
  Highest = 5,
  BestForNavigation = 6,
}

export interface LocationCoords {
  latitude: number;
  longitude: number;
  altitude: number | null;
  accuracy: number | null;
  altitudeAccuracy: number | null;
  heading: number | null;
  speed: number | null;
}

export interface LocationObject {
  coords: LocationCoords;
  timestamp: number;
}

export interface LocationSubscription {
  remove(): void;
}

export interface LocationOptions {
  accuracy?: Accuracy;
  distanceInterval?: number;
  timeInterval?: number;
}

export interface LocationTaskOptions extends LocationOptions {
  showsBackgroundLocationIndicator?: boolean;
  foregroundService?: {
    notificationTitle: string;
    notificationBody: string;
    notificationColor?: string;
  };
}

export interface PermissionResponse {
  status: string;
  granted: boolean;
}

export async function requestForegroundPermissionsAsync(): Promise<PermissionResponse> {
  if (Platform.OS === "android") {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: "Location Permission",
          message: "IronPulse needs location access to track your cardio sessions.",
          buttonPositive: "Allow",
          buttonNegative: "Deny",
        }
      );
      const ok = granted === PermissionsAndroid.RESULTS.GRANTED;
      return { status: ok ? "granted" : "denied", granted: ok };
    } catch {
      return { status: "denied", granted: false };
    }
  }
  return { status: "granted", granted: true };
}

export async function requestBackgroundPermissionsAsync(): Promise<PermissionResponse> {
  // Background location not supported by community geolocation
  return { status: "denied", granted: false };
}

export async function watchPositionAsync(
  options: LocationOptions,
  callback: (location: LocationObject) => void,
): Promise<LocationSubscription> {
  if (!Geolocation) {
    console.warn("[location] Geolocation not available");
    return { remove: () => {} };
  }

  const watchId = Geolocation.watchPosition(
    (position: any) => {
      callback({
        coords: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          altitude: position.coords.altitude ?? null,
          accuracy: position.coords.accuracy ?? null,
          altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
          heading: position.coords.heading ?? null,
          speed: position.coords.speed ?? null,
        },
        timestamp: position.timestamp,
      });
    },
    (error: any) => {
      console.warn("[location] Watch error:", error.code, error.message);
    },
    {
      enableHighAccuracy: (options.accuracy ?? Accuracy.High) >= Accuracy.High,
      distanceFilter: options.distanceInterval ?? 5,
      interval: options.timeInterval ?? 3000,
      fastestInterval: 1000,
    }
  );

  return {
    remove: () => {
      if (Geolocation && watchId != null) {
        Geolocation.clearWatch(watchId);
      }
    },
  };
}

export async function startLocationUpdatesAsync(
  _taskName: string,
  _options?: LocationTaskOptions,
): Promise<void> {
  // Background tasks not supported — foreground watchPosition handles tracking
}

export async function stopLocationUpdatesAsync(
  _taskName: string,
): Promise<void> {
  // No-op
}
