import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.next/",
      "**/.turbo/",
      "**/coverage/",
      "**/test-results/",
      "apps/mobile/android/",
      "apps/mobile/ios/",
      "packages/db/prisma/migrations/",
    ],
  },
  {
    linterOptions: {
      // Ignore eslint-disable comments for rules from plugins not installed
      // (Next.js, React hooks — handled by their own tooling)
      reportUnusedDisableDirectives: "off",
    },
    rules: {
      // Allow unused vars prefixed with _ (common pattern for destructuring)
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // Allow explicit any — tracked separately in #208
      "@typescript-eslint/no-explicit-any": "off",
      // Allow require imports (used in React Native config files)
      "@typescript-eslint/no-require-imports": "off",
      // Allow empty catch blocks with a comment (intentional in some cases)
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
);
