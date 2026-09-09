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
//
// Additionally, on linux-arm64 hosts (the Forgejo runner arm-vm), the
// react-native gradle plugin's getHermesOSBin() only recognises win/mac/linux-
// amd64 and aborts with "OS not recognized" before hermesc runs. The prebuilt
// linux64-bin/hermesc is a static x86_64 ELF that runs fine under
// qemu-user-static (already installed by the CI step "Install qemu-user-static
// for x86_64 aapt2 emulation on arm64"). Expo's prebuild template already
// resolves the hermesc path via require.resolve('react-native/package.json'),
// then appends "/sdks/hermesc/%OS-BIN%/hermesc". We patch just the %OS-BIN%
// substitution to "linux64-bin" so the resulting hermesCommand stays a valid
// absolute path (the Groovy expression is evaluated at configure time). On
// macOS/EAS builds we leave it untouched so RN autodetects "osx-bin".

const { withAppBuildGradle } = require("expo/config-plugins");

const COMMENTED_DEFAULT =
  /^\s*\/\/\s*debuggableVariants\s*=\s*\[.*\]\s*$/m;
const REACT_BLOCK_OPEN = /^react\s*\{\s*$/m;
// Match the %OS-BIN% substitution inside expo's prebuild template line for
// hermesCommand. Kept narrow so we only rewrite that one token.
const OS_BIN_TOKEN = /%OS-BIN%/g;

function patchDebuggableVariants(contents) {
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

function patchHermesCommand(contents, injectHermes) {
  if (!injectHermes) return contents;
  // Rewrite only the %OS-BIN% token in expo's hermesCommand template line.
  // The template resolves the hermesc directory absolutely via
  // require.resolve('react-native/package.json'); we only need to force the
  // per-OS subdirectory to "linux64-bin" (whose x86_64 binary runs under
  // qemu-user-static on arm64 hosts).
  return contents.replace(OS_BIN_TOKEN, "linux64-bin");
}

function patchAppBuildGradle(contents, options = {}) {
  const injectHermes =
    options.injectHermes ?? process.platform === "linux";
  return patchHermesCommand(patchDebuggableVariants(contents), injectHermes);
}

module.exports = function androidE2eBundle(config) {
  if (process.env.EXPO_PUBLIC_E2E !== "1") return config;
  return withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = patchAppBuildGradle(cfg.modResults.contents);
    return cfg;
  });
};

module.exports.patchAppBuildGradle = patchAppBuildGradle;
