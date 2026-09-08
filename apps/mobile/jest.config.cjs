const transformIgnoreAllowlist = [
  "(jest-)?react-native",
  "@react-native(-community)?",
  "@react-navigation",
  "react-native-.*",
  "lucide-react-native",
  "@powersync",
  "expo(-.*)?",
  "@expo(-.*)?",
  // superjson ships ESM only. It reaches the workout component tests
  // transitively: focus-mode-composer -> lib/workout-efficiency-telemetry
  // -> lib/trpc -> superjson.
  // ...and superjson's own ESM-only dependency chain.
  "superjson",
  "copy-anything",
  "is-what",
];

/** @type {import('jest').Config} */
module.exports = {
  preset: "react-native",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: [
    "<rootDir>/components/__tests__/**/*.test.tsx",
    "<rootDir>/components/**/__tests__/**/*.test.tsx",
  ],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": ["babel-jest", { configFile: "./babel.config.js" }],
  },
  // pnpm nests real packages under .pnpm/<name>@<ver>/node_modules/<name>.
  // Match either layout so RN-family packages get transformed by babel-jest.
  transformIgnorePatterns: [
    `node_modules/(?!(\\.pnpm/[^/]+/node_modules/)?(${transformIgnoreAllowlist.join("|")})/)`,
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};
