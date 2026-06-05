module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo pairs with @expo/metro-config and auto-includes the
    // reanimated/worklets plugin — do not add it manually (double-application
    // breaks Hermes).
    presets: ["babel-preset-expo"],
  };
};
