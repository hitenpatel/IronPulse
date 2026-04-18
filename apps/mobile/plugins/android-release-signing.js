// Expo config plugin — ensures android/app/build.gradle has a release
// signing config that reads from android/keystore.properties. Without
// this, every `expo prebuild` regenerates build.gradle and wipes the
// signing block, leaving release builds self-signed with the debug key.
//
// The companion build-android.sh wrapper writes keystore.properties from
// the .env file in apps/mobile/keystore/ so no secrets land in the repo.

const { withAppBuildGradle } = require("expo/config-plugins");

const SIGNING_BLOCK = `
// ─── Release signing (injected by android-release-signing plugin) ──────
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`;

const SIGNING_CONFIGS_BLOCK = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`;

module.exports = function androidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // 1. Inject the keystorePropertiesFile loader near the top, after the
    //    `apply plugin` lines.
    if (!gradle.includes("keystorePropertiesFile")) {
      gradle = gradle.replace(
        /(apply plugin: "com\.facebook\.react"[^\n]*\n)/,
        `$1\n${SIGNING_BLOCK.trim()}\n`,
      );
    }

    // 2. Replace any existing signingConfigs block inside android { ... }
    //    with our canonical version. Prebuild writes a debug-only block;
    //    we want to extend it with the release config.
    if (/signingConfigs\s*\{[\s\S]*?release\s*\{[\s\S]*?\}\s*\}/.test(gradle)) {
      // already patched — no-op
    } else if (/signingConfigs\s*\{[\s\S]*?\}/.test(gradle)) {
      gradle = gradle.replace(
        /signingConfigs\s*\{[\s\S]*?\n\s{4}\}/,
        SIGNING_CONFIGS_BLOCK.trim(),
      );
    } else {
      // No signingConfigs at all — inject before the buildTypes block.
      gradle = gradle.replace(
        /(\s+)buildTypes\s*\{/,
        `$1${SIGNING_CONFIGS_BLOCK.trim()}$1buildTypes {`,
      );
    }

    // 3. Wire up the release build type to use the release signing config
    //    when the properties file is present, otherwise fall back to debug.
    gradle = gradle.replace(
      /release\s*\{\s*\n(\s*)signingConfig\s+signingConfigs\.[a-z]+/,
      (_match, indent) =>
        `release {\n${indent}signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`,
    );

    cfg.modResults.contents = gradle;
    return cfg;
  });
};
