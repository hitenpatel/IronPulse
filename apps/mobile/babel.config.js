module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo pairs with @expo/metro-config (sets up the Expo module
    // runtime so `require` exists at startup).
    presets: ["babel-preset-expo"],
    plugins: [
      // reanimated 3.x needs its own plugin, listed LAST — fixes the
      // "_toString doesn't exist" ReferenceError under Hermes.
      "react-native-reanimated/plugin",
    ],
  };
};
