import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { auditTrackedFiles, isScannablePath } from "./lib/brand-audit.mjs";

const identity = JSON.parse(
  readFileSync(new URL("../packages/shared/src/identity.json", import.meta.url), "utf8"),
);
const shippingId = identity.immutableCompatibility.applicationIds[0];
const legacyDatabase = identity.migrationOnly.powerSyncDatabase;
const legacyMettleOrigin = Object.keys(identity.migrationOnly.legacyOrigins)[2];
const legacyDisplayName =
  identity.migrationOnly.service[0].toUpperCase() + identity.migrationOnly.service.slice(1);

function fixture({ files, contents, allowlist = { compatibility: [] }, history = [] }) {
  const root = mkdtempSync(join(tmpdir(), "zor-brand-audit-"));
  for (const [path, content] of Object.entries(contents)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
  return { root, files, allowlist, history, identity };
}

test.afterEach(() => {
  for (const path of testRoots.splice(0)) rmSync(path, { recursive: true, force: true });
});

const testRoots = [];
function run(options) {
  const input = fixture(options);
  testRoots.push(input.root);
  return auditTrackedFiles(input);
}

test("scans compound environment examples from the tracked-file list", () => {
  const result = run({
    files: ["docker/.env.prod.example"],
    contents: {
      "docker/.env.prod.example": `APP_URL=${legacyMettleOrigin.replace(".hiten-patel.co.uk", ".example")}`,
    },
  });
  assert.equal(result.forbiddenLegacy.length, 1);
  assert.deepEqual(result.scannedFiles, ["docker/.env.prod.example"]);
});

test("does not scan an untracked agent artifact", () => {
  const result = run({
    files: ["README.md"],
    contents: {
      "README.md": "Zor",
      ".claude/worktrees/report.md": legacyMettleOrigin,
    },
  });
  assert.deepEqual(result.forbiddenLegacy, []);
  assert.deepEqual(result.scannedFiles, ["README.md"]);
});

test("allows only exact immutable and migration literals at exact paths", () => {
  const result = run({
    files: ["apps/mobile/app.config.js", "apps/mobile/lib/database-readiness.ts"],
    contents: {
      "apps/mobile/app.config.js": `const id = "${shippingId}"`,
      "apps/mobile/lib/database-readiness.ts": `const old = "${legacyDatabase}"`,
    },
    allowlist: {
      compatibility: [
        {
          path: "apps/mobile/app.config.js",
          patterns: [shippingId],
          reason: "immutable shipping application ID",
        },
        {
          path: "apps/mobile/lib/database-readiness.ts",
          patterns: [legacyDatabase],
          reason: "one-time client database migration input",
        },
      ],
    },
  });
  assert.deepEqual(result.invalidCompatibility, []);
  assert.deepEqual(result.forbiddenLegacy, []);
});

test("rejects an immutable-looking identifier at an unapproved path", () => {
  const result = run({
    files: ["apps/mobile/lib/config.ts"],
    contents: { "apps/mobile/lib/config.ts": `export const id = "${shippingId}"` },
  });
  assert.equal(result.invalidCompatibility.length, 1);
});

test("rejects near-miss compatibility values even on an approved path", () => {
  const result = run({
    files: ["apps/mobile/app.config.js"],
    contents: { "apps/mobile/app.config.js": `const id = "${shippingId}.beta"` },
    allowlist: {
      compatibility: [
        {
          path: "apps/mobile/app.config.js",
          patterns: [shippingId],
          reason: "immutable shipping application ID",
        },
      ],
    },
  });
  assert.equal(result.invalidCompatibility.length, 1);
});

test("supports an explicit list of exact paths without allowing sibling files", () => {
  const result = run({
    files: ["apps/mobile/e2e/one.yaml", "apps/mobile/e2e/unlisted.yaml"],
    contents: {
      "apps/mobile/e2e/one.yaml": `appId: ${shippingId}`,
      "apps/mobile/e2e/unlisted.yaml": `appId: ${shippingId}`,
    },
    allowlist: {
      compatibility: [{
        paths: ["apps/mobile/e2e/one.yaml", "apps/mobile/e2e/two.yaml"],
        patterns: [shippingId],
        reason: "immutable shipping application ID",
      }],
    },
  });

  assert.equal(result.invalidCompatibility.length, 1);
  assert.equal(result.invalidCompatibility[0].path, "apps/mobile/e2e/unlisted.yaml");
});

test("skips only exact frozen history paths", () => {
  const result = run({
    files: ["docs/adr/001-old-name.md", "docs/runbooks/current.md"],
    contents: {
      "docs/adr/001-old-name.md": legacyDisplayName,
      "docs/runbooks/current.md": legacyDisplayName,
    },
    history: ["docs/adr/001-old-name.md"],
  });
  assert.equal(result.forbiddenLegacy.length, 1);
  assert.match(result.forbiddenLegacy[0].path, /docs\/runbooks\/current\.md/u);
});

test("preserves historical implementation notes in active backlog tasks", () => {
  const result = run({
    files: ["backlog/tasks/task-99 - active.md"],
    contents: {
      "backlog/tasks/task-99 - active.md": [
        "<!-- SECTION:DESCRIPTION:BEGIN -->",
        "Current Zor work",
        "<!-- SECTION:DESCRIPTION:END -->",
        "<!-- SECTION:NOTES:BEGIN -->",
        `${legacyDisplayName} historical commit evidence`,
        "<!-- SECTION:NOTES:END -->",
      ].join("\n"),
    },
  });

  assert.deepEqual(result.forbiddenLegacy, []);
  assert.deepEqual(result.invalidCompatibility, []);
});

test("recognizes every supported active text format", () => {
  for (const path of [
    "a.ts", "a.tsx", "a.js", "a.jsx", "a.mjs", "a.cjs", "a.json",
    "a.md", "a.yaml", "a.yml", "a.sh", "a.plist", "a.xml", "a.gradle",
    "a.conf", "Dockerfile", "Caddyfile.dev", ".env.example",
    ".env.prod.example", ".env.staging.example",
  ]) {
    assert.equal(isScannablePath(path), true, path);
  }
  assert.equal(isScannablePath("image.png"), false);
});
