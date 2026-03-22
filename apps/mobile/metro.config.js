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

// In E2E mode, stub out PowerSync modules that crash on Hermes (SharedArrayBuffer)
console.log("[Metro Config] EXPO_PUBLIC_E2E =", process.env.EXPO_PUBLIC_E2E);
if (process.env.EXPO_PUBLIC_E2E === "1") {
  console.log("[Metro Config] Stubbing PowerSync modules for E2E build");
  const originalResolveRequest = config.resolver.resolveRequest;
  config.resolver.resolveRequest = (context, moduleName, platform) => {
    // Stub PowerSync modules with empty modules
    if (
      moduleName.startsWith("@powersync/") ||
      moduleName === "@ironpulse/sync"
    ) {
      return {
        filePath: path.resolve(projectRoot, "lib/powersync-stub.js"),
        type: "sourceFile",
      };
    }
    if (originalResolveRequest) {
      return originalResolveRequest(context, moduleName, platform);
    }
    return context.resolveRequest(context, moduleName, platform);
  };
}

module.exports = config;
