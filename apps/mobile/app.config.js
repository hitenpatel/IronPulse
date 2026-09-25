const IDENTITY = require("../../packages/shared/src/identity.json");

const IS_E2E = process.env.EXPO_PUBLIC_E2E === "1";
const APPLICATION_ID = IDENTITY.immutableCompatibility.applicationIds[Number(IS_E2E)];

module.exports = ({ config }) => ({
  ...config,
  owner: "hiten123",
  name: IS_E2E ? `${IDENTITY.product.displayName} E2E` : IDENTITY.product.displayName,
  slug: "zor",
  version: "1.0.0",
  scheme: IDENTITY.mobile.deepLinkSchemes,
  userInterfaceStyle: "dark",
  ios: {
    bundleIdentifier: APPLICATION_ID,
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
    package: APPLICATION_ID,
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
      projectId: IDENTITY.mobile.easProjectId,
    },
  },
  plugins: [
    "./plugins/swift-concurrency-fix",
    "./plugins/android-cleartext",
    "./plugins/android-gradle-memory",
    "./plugins/android-release-signing",
    "./plugins/android-e2e-bundle",
    "expo-notifications",
  ],
});
