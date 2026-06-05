const { getDefaultConfig } = require("@expo/metro-config");
const { mergeConfig } = require("metro");
const path = require("path");

const projectRoot = __dirname;

// @expo/metro-config already resolves the workspace root (monorepoRoot) and
// configures watchFolders + nodeModulesPaths for pnpm monorepos automatically.
const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  resolver: {
    disableHierarchicalLookup: true,
    extraNodeModules: {
      "@": projectRoot,
    },
  },
};

const merged = mergeConfig(defaultConfig, config);

// Custom resolver: handles @/ path alias and E2E stubs
const isE2E = process.env.E2E === "1";
console.log("[Metro Config] E2E =", process.env.E2E, "isE2E =", isE2E);

const stubPath = isE2E ? path.resolve(projectRoot, "lib/powersync-stub.js") : null;
const e2eAppPath = isE2E ? path.resolve(projectRoot, "App.e2e.tsx") : null;

merged.resolver.resolveRequest = (context, moduleName, platform) => {
  // Resolve @/ path alias to project root
  if (moduleName.startsWith("@/")) {
    const relativePath = moduleName.slice(2); // strip "@/"
    const resolved = path.resolve(projectRoot, relativePath);
    return context.resolveRequest(context, resolved, platform);
  }

  // E2E mode stubs
  if (isE2E) {
    if (moduleName === "./App" && context.originModulePath?.endsWith("index.js")) {
      return { filePath: e2eAppPath, type: "sourceFile" };
    }
    if (
      moduleName === "@powersync/react" ||
      moduleName === "@powersync/react-native" ||
      moduleName === "@powersync/common" ||
      moduleName.startsWith("@powersync/") ||
      moduleName === "@ironpulse/sync" ||
      moduleName.startsWith("@journeyapps/react-native-quick-sqlite")
    ) {
      return { filePath: stubPath, type: "sourceFile" };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = merged;
