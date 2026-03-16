module.exports = {
  dependencies: {
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
  },
};
