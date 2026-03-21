module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // Must be listed LAST — fixes "_toString" ReferenceError with Hermes
      "react-native-reanimated/plugin",
    ],
  };
};
