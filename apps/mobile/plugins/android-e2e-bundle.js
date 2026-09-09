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
// for x86_64 aapt2 emulation on arm64"). We therefore inject an explicit
// `hermesCommand` pointing at that binary when we detect a linux host, so
// hermesc runs via qemu emulation. On macOS/EAS builds hermesc is autodetected
// and we do not inject anything.

const { withAppBuildGradle } = require("expo/config-plugins");

const COMMENTED_DEFAULT =
  /^\s*\/\/\s*debuggableVariants\s*=\s*\[.*\]\s*$/m;
const REACT_BLOCK_OPEN = /^react\s*\{\s*$/m;
// Match the expo/RN default template line, which uses a %OS-BIN% substitution
// resolved by react-native-gradle-plugin's getHermesOSBin() and aborts on
// linux-arm64. We replace that entire line so no later assignment overrides
// our absolute path (Groovy last-write-wins inside the react { } block).
const HERMES_TEMPLATE_LINE = /^\s*hermesCommand\s*=.*%OS-BIN%.*$/m;
const HERMES_LINUX_LITERAL_LINE =
  /^\s{4}hermesCommand\s*=\s*"[^"]*hermesc[^"]*"\s*$/m;
const HERMES_LINUX_PATH =
  '"../node_modules/react-native/sdks/hermesc/linux64-bin/hermesc"';
const HERMES_LINUX_LINE = `    hermesCommand = ${HERMES_LINUX_PATH}`;

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
  // If the expo/RN default `%OS-BIN%` line is present, replace it in place so
  // no later assignment overrides ours. Otherwise, if we've already patched,
  // leave the file alone. Otherwise, inject a new line after `react {`.
  if (HERMES_TEMPLATE_LINE.test(contents)) {
    return contents.replace(HERMES_TEMPLATE_LINE, HERMES_LINUX_LINE);
  }
  if (HERMES_LINUX_LITERAL_LINE.test(contents)) return contents;
  if (!REACT_BLOCK_OPEN.test(contents)) {
    throw new Error(
      "android-e2e-bundle: could not find `react {` block in app/build.gradle",
    );
  }
  return contents.replace(
    REACT_BLOCK_OPEN,
    `react {\n${HERMES_LINUX_LINE}`,
  );
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
