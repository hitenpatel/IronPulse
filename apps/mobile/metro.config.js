const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

config.resolver.disableHierarchicalLookup = true;

// Inject SharedArrayBuffer polyfill at the very start of the bundle
// This runs before ANY module evaluation, including native module init
config.serializer = {
  ...config.serializer,
  getPolyfills: () => {
    const defaultPolyfills = require("react-native/rn-get-polyfills")();
    return [
      path.resolve(projectRoot, "lib/shared-array-buffer-polyfill.js"),
      ...defaultPolyfills,
    ];
  },
};

// In E2E mode, stub out PowerSync modules that crash on Hermes (SharedArrayBuffer)
const isE2E = process.env.EXPO_PUBLIC_E2E === "1";
console.log("[Metro Config] EXPO_PUBLIC_E2E =", process.env.EXPO_PUBLIC_E2E, "isE2E =", isE2E);

if (isE2E) {
  console.log("[Metro Config] E2E mode: redirecting App to App.e2e, stubbing PowerSync");
  const stubPath = path.resolve(projectRoot, "lib/powersync-stub.js");
  const e2eAppPath = path.resolve(projectRoot, "App.e2e.tsx");

  // Use resolveRequest to intercept ALL module resolutions
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Redirect App.tsx to App.e2e.tsx (no PowerSync dependency chain)
    if (moduleName === "./App" && context.originModulePath?.endsWith("index.js")) {
      console.log("[Metro E2E] Redirecting ./App to ./App.e2e");
      return { filePath: e2eAppPath, type: "sourceFile" };
    }
    // Match any powersync or ironpulse/sync import from ANY location.
    // Also catch @journeyapps/react-native-quick-sqlite (peer dep of
    // @powersync/react-native) which may be hoisted in CI builds.
    if (
      moduleName === "@powersync/react" ||
      moduleName === "@powersync/react-native" ||
      moduleName === "@powersync/common" ||
      moduleName.startsWith("@powersync/") ||
      moduleName === "@ironpulse/sync" ||
      moduleName.startsWith("@journeyapps/react-native-quick-sqlite")
    ) {
      console.log(`[Metro Stub] Stubbing: ${moduleName}`);
      return { filePath: stubPath, type: "sourceFile" };
    }
    // Default resolution
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
