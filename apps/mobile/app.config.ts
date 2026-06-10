import { ExpoConfig, ConfigContext } from "expo/config";

// The e2e build ships the same JS bundle + native code as production; only the
// applicationId and backend URL differ, so it installs alongside the real app
// and exercises the same code paths. Driven by the `e2e` EAS profile.
const IS_E2E = process.env.EXPO_PUBLIC_E2E === "1";
const ANDROID_PACKAGE = IS_E2E ? "com.ironpulse.app.e2e" : "com.ironpulse.app";
const IOS_BUNDLE = IS_E2E ? "com.ironpulse.app.e2e" : "com.ironpulse.app";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: IS_E2E ? "IronPulse E2E" : "IronPulse",
  slug: "ironpulse",
  version: "1.0.0",
  scheme: "ironpulse",
  userInterfaceStyle: "dark",
  ios: {
    bundleIdentifier: IOS_BUNDLE,
    supportsTablet: true,
    infoPlist: {
      NSHealthShareUsageDescription:
        "IronPulse reads your workouts and body weight from Apple Health to show them in your activity feed.",
      NSHealthUpdateUsageDescription:
        "IronPulse saves your logged workouts and weight to Apple Health.",
      NSLocationWhenInUseUsageDescription:
        "IronPulse needs your location to track runs, rides, and hikes.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "IronPulse needs your location to track runs, rides, and hikes.",
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      foregroundImage: "./assets/icon.png",
      backgroundColor: "#000000",
    },
    permissions: [
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "ACCESS_BACKGROUND_LOCATION",
    ],
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
    "./plugins/android-gradle-memory",
    "./plugins/android-release-signing",
    "expo-notifications",
  ],
});
