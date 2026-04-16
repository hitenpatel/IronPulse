module.exports = {
  project: {
    android: {
      sourceDir: './android',
      packageName: 'com.ironpulse.app',
    },
    ios: {
      sourceDir: './ios',
    },
  },
  dependencies: {
    // @powersync/react-native: uses SharedArrayBuffer which crashes on Hermes Android debug
    // In E2E builds, PowerSync is stubbed via Metro config
    '@powersync/react-native': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // react-native-worklets: only needed for Babel plugin, native code
    // conflicts with react-native-reanimated which bundles its own worklets
    'react-native-worklets': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // react-native-google-fit uses jcenter() which is removed in Gradle 9
    // Exclude from autolinking - Google Fit accessed via JS API wrapper
    'react-native-google-fit': {
      platforms: {
        android: null,
        ios: null,
      },
    },
    // react-native-health is iOS only - exclude from Android autolinking
    'react-native-health': {
      platforms: {
        android: null,
      },
    },
    // expo-in-app-purchases has compilation issues with newer SDKs
    // IAP functionality accessed via JS wrapper, native module not needed for E2E
    'expo-in-app-purchases': {
      platforms: {
        android: null,
        ios: null,
      },
    },
  },
};
