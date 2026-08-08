const IS_E2E = process.env.EXPO_PUBLIC_E2E === "1";
const ANDROID_PACKAGE = IS_E2E ? "com.ironpulse.app.e2e" : "com.ironpulse.app";
const IOS_BUNDLE = IS_E2E ? "com.ironpulse.app.e2e" : "com.ironpulse.app";

module.exports = ({ config }) => ({
  ...config,
  name: IS_E2E ? "Zor E2E" : "Zor",
  slug: "ironpulse",
  version: "1.0.0",
  scheme: ["zor", "ironpulse"],
  userInterfaceStyle: "dark",
  ios: {
    bundleIdentifier: IOS_BUNDLE,
    supportsTablet: true,
    infoPlist: {
      NSHealthShareUsageDescription:
        "Zor reads your workouts and body weight from Apple Health to show them in your activity feed.",
      NSHealthUpdateUsageDescription:
        "Zor saves your logged workouts and weight to Apple Health.",
      NSLocationWhenInUseUsageDescription:
        "Zor needs your location to track runs, rides, and hikes.",
      NSLocationAlwaysAndWhenInUseUsageDescription:
        "Zor needs your location to track runs, rides, and hikes.",
    },
  },
  android: {
    package: ANDROID_PACKAGE,
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
      backgroundColor: "#D4FF3A",
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
