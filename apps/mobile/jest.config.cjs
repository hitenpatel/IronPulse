const transformIgnoreAllowlist = [
  "(jest-)?react-native",
  "@react-native(-community)?",
  "@react-navigation",
  "react-native-.*",
  "lucide-react-native",
  "@powersync",
  "expo(-.*)?",
  "@expo(-.*)?",
];

/** @type {import('jest').Config} */
module.exports = {
  preset: "react-native",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.setup.ts"],
  testMatch: ["<rootDir>/components/__tests__/**/*.test.tsx"],
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
