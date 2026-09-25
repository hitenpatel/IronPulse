import { readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";

const SCANNABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md",
  ".yaml", ".yml", ".sh", ".plist", ".xml", ".gradle", ".conf",
]);

const CONTROL_FILES = new Set([
  "packages/shared/src/identity.json",
  "scripts/brand-allowlist.json",
  "scripts/brand-history.json",
  "scripts/brand-audit.mjs",
  "scripts/lib/brand-audit.mjs",
]);

const LEGACY_PATTERN = /Mettle\s*Lift|mettlelift|IronPulse|ironpulse/giu;
const COMPATIBILITY_TOKEN_PATTERN = /[A-Za-z0-9._-]/u;

export function isScannablePath(path) {
  const name = basename(path);
  return (
    SCANNABLE_EXTENSIONS.has(extname(name)) ||
    name === "Dockerfile" ||
    name === "Caddyfile.dev" ||
    /^\.env(?:\.[^.]+)*\.example$/u.test(name)
  );
}

function pathInScope(path, scope) {
  if (scope === "all") return true;
  const isInfra =
    path.startsWith("docker/") ||
    path.startsWith(".forgejo/") ||
    path.startsWith("scripts/") ||
    path === ".env.example";
  return scope === "infra" ? isInfra : !isInfra;
}

function flattenStrings(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(flattenStrings);
  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => [key, ...flattenStrings(child)]);
  }
  return [];
}

function occurrences(line) {
  return [...line.matchAll(LEGACY_PATTERN)].map((match) => ({
    index: match.index ?? 0,
    value: match[0],
  }));
}

function exactPatternRanges(line, pattern) {
  const ranges = [];
  let from = 0;
  while (from <= line.length) {
    const index = line.indexOf(pattern, from);
    if (index === -1) break;
    const before = line[index - 1];
    const after = line[index + pattern.length];
    const boundedBefore = before === undefined || !COMPATIBILITY_TOKEN_PATTERN.test(before);
    const boundedAfter = after === undefined || !COMPATIBILITY_TOKEN_PATTERN.test(after);
    if (boundedBefore && boundedAfter) ranges.push([index, index + pattern.length]);
    from = index + Math.max(pattern.length, 1);
  }
  return ranges;
}

function allowedRanges(path, line, allowlist) {
  return (allowlist.compatibility ?? [])
    .filter((entry) => entry.path === path && entry.reason?.trim())
    .flatMap((entry) => entry.patterns.flatMap((pattern) => exactPatternRanges(line, pattern)));
}

function isCovered(index, ranges) {
  return ranges.some(([start, end]) => index >= start && index < end);
}

function compatibilityLike(line, identity) {
  const lower = line.toLowerCase();
  return flattenStrings({
    immutableCompatibility: identity.immutableCompatibility,
    migrationOnly: identity.migrationOnly,
  }).some((literal) => {
    const candidate = literal.toLowerCase();
    return candidate.length >= 10 && lower.includes(candidate);
  });
}

export function auditTrackedFiles({
  root,
  files,
  allowlist,
  history,
  identity,
  scope = "all",
  readFile = (path) => readFileSync(join(root, path), "utf8"),
}) {
  const historical = new Set(history);
  const forbiddenLegacy = [];
  const invalidCompatibility = [];
  const scannedFiles = [];

  for (const path of [...files].sort()) {
    if (
      CONTROL_FILES.has(path) ||
      historical.has(path) ||
      !pathInScope(path, scope) ||
      !isScannablePath(path)
    ) continue;

    scannedFiles.push(path);
    const content = readFile(path);
    for (const [lineIndex, line] of content.split(/\r?\n/u).entries()) {
      const ranges = allowedRanges(path, line, allowlist);
      const uncovered = occurrences(line).filter(({ index }) => !isCovered(index, ranges));
      if (uncovered.length === 0) continue;

      const finding = {
        path,
        line: lineIndex + 1,
        text: line.trim(),
        matches: uncovered.map(({ value }) => value),
      };
      if (compatibilityLike(line, identity)) invalidCompatibility.push(finding);
      else forbiddenLegacy.push(finding);
    }
  }

  return { forbiddenLegacy, invalidCompatibility, scannedFiles };
}
