module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["module:@react-native/babel-preset"],
    plugins: [
      // Must be listed LAST — fixes "_toString" ReferenceError with Hermes
      "react-native-reanimated/plugin",
    ],
  };
};
