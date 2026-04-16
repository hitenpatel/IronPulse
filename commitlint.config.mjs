export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allow longer subjects for descriptive commit messages
    "header-max-length": [2, "always", 100],
    // Standard types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
  },
};
