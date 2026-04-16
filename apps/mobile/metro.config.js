const { getDefaultConfig, mergeConfig } = require("@react-native/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const defaultConfig = getDefaultConfig(projectRoot);

const config = {
  watchFolders: [monorepoRoot],
  resolver: {
    nodeModulesPaths: [
      path.resolve(projectRoot, "node_modules"),
      path.resolve(monorepoRoot, "node_modules"),
    ],
    disableHierarchicalLookup: true,
    // Resolve @/ path alias to the project root
    extraNodeModules: {
      "@": projectRoot,
    },
  },
  serializer: {
    // Inject SharedArrayBuffer polyfill at the very start of the bundle
    // This runs before ANY module evaluation, including native module init
    getPolyfills: () => {
      const defaultPolyfills = require("react-native/rn-get-polyfills")();
      return [
        ...defaultPolyfills,
        path.resolve(projectRoot, "lib/shared-array-buffer-polyfill.js"),
      ];
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
