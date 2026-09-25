#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { auditTrackedFiles } from "./lib/brand-audit.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

export function parseScope(argv) {
  const index = argv.indexOf("--scope");
  const scope = index === -1 ? "all" : argv[index + 1];
  if (!new Set(["product", "infra", "all"]).has(scope)) {
    throw new Error("--scope must be product|infra|all");
  }
  return scope;
}

function sameArray(actual, expected) {
  return Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index]);
}

function validateExpoConfig(identity, config, e2e) {
  const errors = [];
  const expectedId = identity.immutableCompatibility.applicationIds[Number(e2e)];
  const variant = e2e ? "E2E" : "production";
  const expectedName = e2e ? `${identity.product.displayName} E2E` : identity.product.displayName;

  if (config.name !== expectedName) errors.push(`Expo ${variant} name must be ${expectedName}`);
  if (config.slug !== "zor") errors.push(`Expo ${variant} slug must be zor`);
  if (!sameArray(config.scheme, identity.mobile.deepLinkSchemes)) {
    errors.push(`Expo ${variant} schemes must be exactly ${identity.mobile.deepLinkSchemes.join(",")}`);
  }
  if (config.ios?.bundleIdentifier !== expectedId) {
    errors.push(`Expo ${variant} iOS bundle identifier must remain ${expectedId}`);
  }
  if (config.android?.package !== expectedId) {
    errors.push(`Expo ${variant} Android application ID must remain ${expectedId}`);
  }
  if (config.extra?.eas?.projectId !== identity.mobile.easProjectId) {
    errors.push(`Expo ${variant} EAS project ID must remain ${identity.mobile.easProjectId}`);
  }
  return errors;
}

export function validateExpoVariants(identity, factory) {
  const errors = [];
  const hadOriginal = Object.hasOwn(process.env, "EXPO_PUBLIC_E2E");
  const original = process.env.EXPO_PUBLIC_E2E;
  try {
    for (const e2e of [false, true]) {
      process.env.EXPO_PUBLIC_E2E = e2e ? "1" : "0";
      const config = factory({ config: { name: "", slug: "" } });
      errors.push(...validateExpoConfig(identity, config, e2e));
    }
  } finally {
    if (hadOriginal) process.env.EXPO_PUBLIC_E2E = original;
    else delete process.env.EXPO_PUBLIC_E2E;
  }
  return errors;
}

export function validateBrandingAssetContract(identity, manifest, sourcePaths) {
  const errors = [];
  if (identity.product?.displayName !== "Zor") errors.push("identity display name must be Zor");
  if (manifest.generator !== "zor-assets-v1") {
    errors.push("asset manifest generator must be zor-assets-v1");
  }
  for (const path of [...sourcePaths, ...Object.keys(manifest.outputs ?? {})]) {
    if (/ironpulse|mettle(?:\s|-)?lift/iu.test(path)) {
      errors.push(`branding path must use canonical zor- naming: ${path}`);
    }
  }
  for (const path of sourcePaths) {
    if (!/\/zor-[^/]+\.(?:svg|png)$/u.test(path)) {
      errors.push(`canonical branding source must have a zor- filename: ${path}`);
    }
  }
  return errors;
}

function loadJson(path) {
  return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
}

function loadExpoFactory() {
  const path = require.resolve(join(ROOT, "apps/mobile/app.config.js"));
  delete require.cache[path];
  return require(path);
}

function collectStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") return Object.values(value).flatMap(collectStrings);
  return [];
}

function renderCompose(files, identity) {
  const args = ["compose"];
  for (const file of files) args.push("-f", file);
  args.push("config", "--format", "json");
  const env = {
    ...process.env,
    IMAGE_TAG: "identity-check",
    CRON_SECRET: "identity-check-cron-secret",
    POSTGRES_USER: identity.infrastructure.postgresRole,
    POSTGRES_DB: identity.infrastructure.postgresDatabase,
    POSTGRES_PASSWORD: "identity-check",
    AUTH_SECRET: "identity-check-identity-check-identity-check",
    ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
    S3_ACCESS_KEY: "identity-check",
    S3_SECRET_KEY: "identity-check-secret",
    MINIO_ROOT_USER: "identity-check",
    MINIO_ROOT_PASSWORD: "identity-check-secret",
  };
  return JSON.parse(execFileSync("docker", args, { cwd: ROOT, env, encoding: "utf8" }));
}

function validateCompose(identity) {
  const errors = [];
  const combinations = [
    ["docker/docker-compose.yml", "docker/docker-compose.dev.yml"],
    ["docker/docker-compose.yml", "docker/docker-compose.e2e.yml"],
    ["docker/docker-compose.yml", "docker/compose.staging.yml"],
    ["docker/docker-compose.yml", "docker/compose.prod.yml"],
  ];
  const forbidden = [
    ...Object.keys(identity.migrationOnly.legacyOrigins),
    ...identity.migrationOnly.repositories,
    identity.migrationOnly.image,
    ...identity.migrationOnly.composeProjects,
    identity.migrationOnly.service,
    identity.migrationOnly.postgres.role,
    ...identity.migrationOnly.postgres.databases,
    identity.migrationOnly.minioBucket,
    identity.migrationOnly.developmentOrigin,
    ...identity.migrationOnly.productionVolumes,
  ];

  for (const files of combinations) {
    const label = files.join(" + ");
    let rendered;
    try {
      rendered = renderCompose(files, identity);
    } catch (error) {
      errors.push(`${label} did not render: ${error.message}`);
      continue;
    }
    if (!rendered.services?.[identity.infrastructure.service]) {
      errors.push(`${label} must expose service ${identity.infrastructure.service}`);
    }
    const strings = collectStrings(rendered);
    for (const value of forbidden) {
      if (strings.some((candidate) => candidate.toLowerCase().includes(value.toLowerCase()))) {
        errors.push(`${label} contains migration-only value ${value}`);
      }
    }
  }
  return errors;
}

function validateTrackedIdentity(identity, scope) {
  const output = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT });
  const files = output.toString("utf8").split("\0").filter(Boolean);
  const result = auditTrackedFiles({
    root: ROOT,
    files,
    allowlist: loadJson("scripts/brand-allowlist.json"),
    history: loadJson("scripts/brand-history.json"),
    identity,
    scope,
  });
  return [...result.forbiddenLegacy, ...result.invalidCompatibility].map(
    (finding) => `${finding.path}:${finding.line} contains ${finding.matches.join(", ")}`,
  );
}

export function runIdentityValidation(scope) {
  const identity = loadJson("packages/shared/src/identity.json");
  const errors = [];
  if (scope === "product" || scope === "all") {
    errors.push(
      ...validateExpoVariants(identity, (input) => loadExpoFactory()(input)),
      ...validateTrackedIdentity(identity, "product"),
    );
  }
  if (scope === "infra" || scope === "all") {
    errors.push(...validateCompose(identity), ...validateTrackedIdentity(identity, "infra"));
  }
  return errors;
}

function main() {
  let scope;
  try {
    scope = parseScope(process.argv.slice(2));
  } catch (error) {
    console.error(`[identity-check] ${error.message}`);
    process.exitCode = 1;
    return;
  }
  const errors = runIdentityValidation(scope);
  for (const error of errors) console.error(`[identity-check] ${error}`);
  if (errors.length) process.exitCode = 1;
  else console.log(`identity-check: ${scope} configuration matches packages/shared/src/identity.json`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) main();
