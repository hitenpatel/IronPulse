// Expo config plugin — bakes the JS bundle into the *debug* APK when building
// the E2E variant (EXPO_PUBLIC_E2E=1).
//
// The React Native gradle plugin skips createBundle<Variant>JsAndAssets for
// every variant listed in `react { debuggableVariants }` (default: ["debug"]),
// so a stock assembleDebug ships an APK that loads JS from Metro at runtime.
// There is no Metro on the nightly runner, so every flow died on the red
// "Unable to load script … index.android.bundle" box. The old
// `-Preact-native.internal.bundleForVariant=debug` gradle flag is not a real
// property and did nothing.
//
// Emptying debuggableVariants makes the debug build bundle + hermes-compile
// like release, while keeping debug signing and the .e2e applicationId.

const { withAppBuildGradle } = require("expo/config-plugins");

const COMMENTED_DEFAULT =
  /^\s*\/\/\s*debuggableVariants\s*=\s*\[.*\]\s*$/m;
const REACT_BLOCK_OPEN = /^react\s*\{\s*$/m;

function patchAppBuildGradle(contents) {
  if (/^\s*debuggableVariants\s*=\s*\[\s*\]\s*$/m.test(contents)) {
    return contents;
  }
  if (COMMENTED_DEFAULT.test(contents)) {
    return contents.replace(COMMENTED_DEFAULT, "    debuggableVariants = []");
  }
  if (REACT_BLOCK_OPEN.test(contents)) {
    return contents.replace(
      REACT_BLOCK_OPEN,
      "react {\n    debuggableVariants = []",
    );
  }
  throw new Error(
    "android-e2e-bundle: could not find `react {` block in app/build.gradle",
  );
}

module.exports = function androidE2eBundle(config) {
  if (process.env.EXPO_PUBLIC_E2E !== "1") return config;
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchAppBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.patchAppBuildGradle = patchAppBuildGradle;
