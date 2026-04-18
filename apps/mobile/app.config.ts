import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "IronPulse",
  slug: "ironpulse",
  version: "1.0.0",
  scheme: "ironpulse",
  userInterfaceStyle: "dark",
  ios: {
    bundleIdentifier: "com.ironpulse.app",
    supportsTablet: true,
    infoPlist: {
      NSHealthShareUsageDescription:
        "IronPulse reads your workouts and body weight from Apple Health to show them in your activity feed.",
      NSHealthUpdateUsageDescription:
        "IronPulse saves your logged workouts and weight to Apple Health.",
    },
  },
  android: {
    package: "com.ironpulse.app",
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#000000",
    },
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY ?? "",
      },
      googleSignIn: {
        apiKey: process.env.GOOGLE_SIGNIN_API_KEY ?? "",
      },
    },
  },
  extra: {
    eas: {
      projectId: "a4541ea9-4c09-42bf-8ae6-f12a5ebb81e3",
    },
  },
  plugins: [
    "./plugins/swift-concurrency-fix",
    "./plugins/android-cleartext",
    "expo-secure-store",
    [
      "expo-location",
      {
        locationAlwaysAndWhenInUsePermission:
          "IronPulse needs your location to track runs, rides, and hikes.",
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
      },
    ],
    "expo-task-manager",
    "expo-notifications",
  ],
});
