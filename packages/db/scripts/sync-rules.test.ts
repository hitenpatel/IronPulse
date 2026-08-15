/**
 * sync-rules.test.ts
 *
 * Guards against PowerSync sync-rules.yaml regressions.
 * PowerSync rejects data queries that contain JOINs at boot; child tables
 * must use denormalized user_id columns for single-table filtering.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve path from this test file up to the repo root, then into docker/
const SYNC_RULES_PATH = resolve(
  __dirname,
  "..",
  "..",
  "..",
  "docker",
  "sync-rules.yaml",
);

const CHILD_TABLES = [
  "workout_exercises",
  "exercise_sets",
  "laps",
  "template_exercises",
  "template_sets",
] as const;

// ── Parse helpers ─────────────────────────────────────────────────────────────

/**
 * Extract all lines that look like PowerSync data queries from the yaml.
 * A data query line starts with `- SELECT` (after stripping leading spaces and
 * the `>` block-scalar indicator that PowerSync uses for multi-line strings).
 */
function extractDataQueries(yaml: string): string[] {
  const queries: string[] = [];
  let current: string[] = [];
  let inData = false;

  for (const raw of yaml.split("\n")) {
    const line = raw.trimStart();

    // Detect `data:` section entry
    if (line.startsWith("data:")) {
      inData = true;
      continue;
    }

    // Leaving data section (new top-level key that isn't indented)
    if (inData && raw.length > 0 && raw[0] !== " " && !line.startsWith("-")) {
      inData = false;
    }

    if (!inData) continue;

    // Start of a new list item (possibly multi-line via `>`)
    if (line.startsWith("- >")) {
      if (current.length > 0) queries.push(current.join(" "));
      current = [];
      continue;
    }

    if (line.startsWith("- SELECT")) {
      if (current.length > 0) queries.push(current.join(" "));
      current = [line.slice(2).trim()]; // strip the `- ` prefix
      continue;
    }

    // Continuation of a `>` block scalar — collect the SQL fragment
    if (current.length > 0 && line.length > 0 && !line.startsWith("-")) {
      current.push(line);
    }
  }

  if (current.length > 0) queries.push(current.join(" "));

  return queries.filter((q) => q.toUpperCase().startsWith("SELECT"));
}

// ── Load the file once ────────────────────────────────────────────────────────

const rawYaml = readFileSync(SYNC_RULES_PATH, "utf8");
const queries = extractDataQueries(rawYaml);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("sync-rules.yaml — no JOINs", () => {
  it("extracts at least one data query", () => {
    expect(queries.length).toBeGreaterThan(0);
  });

  it("every data query contains no JOIN (case-insensitive)", () => {
    for (const q of queries) {
      expect(q.toLowerCase(), `JOIN found in: ${q}`).not.toContain("join");
    }
  });

  it("every data query has exactly one FROM clause", () => {
    for (const q of queries) {
      const upper = q.toUpperCase();
      const count = upper.split("FROM").length - 1;
      expect(count, `Expected exactly 1 FROM in: ${q}`).toBe(1);
    }
  });
});

describe("sync-rules.yaml — child tables filtered by user_id", () => {
  for (const table of CHILD_TABLES) {
    it(`${table} appears in a data query filtered by bucket.user_id`, () => {
      const match = queries.find(
        (q) =>
          q.toLowerCase().includes(`from ${table}`) &&
          q.toLowerCase().includes("bucket.user_id"),
      );
      expect(
        match,
        `No single-table query for ${table} with bucket.user_id filter found`,
      ).toBeDefined();
    });
  }
});
