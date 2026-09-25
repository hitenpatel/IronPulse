# Zor Hard-Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Zor rebrand without changing immutable store identities or losing PostgreSQL, MinIO, mobile, or web offline data.

**Architecture:** A checked-in identity manifest drives validation and active configuration. Foreground mobile and web startup gates migrate legacy server origins and PowerSync storage before constructing PowerSync; the current no-op GPS persistence adapter stays dormant. Server-side work provisions a separate green stack, copies authoritative data with deterministic validation, and moves public traffic during a maintenance window; destructive retirement remains a separate, delayed command.

**Tech Stack:** TypeScript, Node.js 22, Vitest/Jest, React Native 0.81, Expo 54 local native modules (Kotlin/Swift), IndexedDB/Web Locks, PowerSync, Docker Compose, PostgreSQL 16/PostGIS, MinIO Client, Forgejo Actions, Playwright, Maestro.

**Spec:** `docs/superpowers/specs/2026-09-25-zor-hard-cutover-design.md`

## Global Constraints

- Product display name is `Zor`; store listing name is `Zor Fitness`.
- Origins are exactly `https://zor.hiten-patel.co.uk`, `https://staging.zor.hiten-patel.co.uk`, and `https://zor.local`.
- Repositories are `hiten/Zor` and `hitenpatel/Zor`; the image is `git.hiten-patel.co.uk/hiten/zor`.
- Compose projects are `zor-prod` and `zor-staging`; the application service is `zor`.
- PostgreSQL production role/database are `zor` / `zor`; the test role/database are `zor` / `zor_test`.
- The MinIO bucket is `zor`, the backup prefix is `zor_`, the client database is `zor.db`, the only active deep-link scheme is `zor://`, and the deployment lock is `/tmp/zor-deploy.lock`.
- Keep `com.ironpulse.app`, `com.ironpulse.app.e2e`, existing `com.ironpulse.*` IAP product IDs, and EAS project UUID `a4541ea9-4c09-42bf-8ae6-f12a5ebb81e3` unchanged.
- Migration-only legacy origins are the four exact IronPulse/Mettle Lift production and staging origins listed in the spec; arbitrary self-hosted origins must remain unchanged.
- Data migration never drops or mutates its source. Cleanup is a separate command requiring an explicit verified-backup marker and seven healthy days.
- Before green writes open, server rollback returns routing to blue. Client origin/storage migrations are one-way and continue using the Zor origins already routed to blue. After green writes open, recovery is roll-forward only.
- PowerSync rehearsal uses `max(25, 2 × observed seven-day peak concurrent clients)`, at least ten unique pending mutations per client, a five-minute drain limit, and zero missing rows, duplicates, or unresolved errors.
- All active configuration must be free of legacy branding except the immutable and migration-only literals represented in the identity manifest.

## Review Focus

- Duplicate foreground startup calls and separate processes must serialize through an in-process mutex plus an OS lock and must never create an empty `zor.db` after a migration error; Task 4 adds same-process, cross-process, and fail-closed tests.
- An interrupted client copy, or both old and new database names being present, must select only a validated destination and retain the source until validation succeeds; Tasks 4 and 5 add these cases.
- A second web tab or SharedWorker holding the legacy IndexedDB database must block activation, discard the unactivated copy, and force a fresh recopy after the holder closes; Task 5 adds real-browser multi-tab coverage.
- Empty or multipart MinIO buckets must not produce false-positive validation; Task 7 tests zero-object symmetry and streamed SHA-256 fallback.
- A cleanup request before the retention gate, without the exact backup marker, or against the wrong source/target must fail before invoking Docker, PostgreSQL, or MinIO commands; Task 8 adds command-runner assertions. DNS and repository retirement remain separately confirmed operator actions.

---

## File map and boundaries

- `packages/shared/src/identity.json` is the data-only source of truth. Runtime code imports the typed projection from `packages/shared/src/identity.ts`; Node scripts read the JSON directly.
- `scripts/lib/brand-audit.mjs` contains pure audit logic. `scripts/brand-audit.mjs` is only the Git-index CLI. `scripts/validate-zor-identity.mjs` verifies configurations that cannot import the manifest.
- `apps/mobile/lib/startup.ts` owns startup ordering. `apps/mobile/lib/database-readiness.ts` is the only JavaScript API allowed to request a database filename. The local Expo module owns filesystem locking, checkpointing, copying, fsync, promotion, and validation.
- `apps/mobile/lib/sqlite.ts` remains a no-op GPS adapter. This project does not activate GPS persistence or place `_gps_buffer` in PowerSync storage.
- `apps/web/src/lib/powersync/indexeddb-migration.ts` owns the browser copy state machine. `system.ts` only constructs PowerSync after that migration resolves.
- `scripts/zor-cutover/` contains data-plane commands with an injected command runner. It cannot perform repository, DNS, or provider mutations.
- `docs/runbooks/zor-hard-cutover.md` owns stateful operator steps, gates, abort criteria, rollback, and retirement.

### Task 1: Canonical identity manifest and tracked-file audit

**Files:**
- Create: `packages/shared/src/identity.json`
- Create: `packages/shared/src/identity.ts`
- Create: `packages/shared/src/__tests__/identity.test.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `scripts/lib/brand-audit.mjs`
- Create: `scripts/brand-audit.test.mjs`
- Rewrite: `scripts/brand-audit.mjs`
- Rewrite: `scripts/brand-allowlist.json`
- Create: `scripts/brand-history.json`
- Create: `scripts/validate-zor-identity.mjs`
- Create: `scripts/validate-zor-identity.test.mjs`
- Modify: `scripts/verify-zor-assets.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `IDENTITY`, a deeply readonly object typed from `identity.json`.
- Produces: `auditTrackedFiles({ root, files, allowlist, history, identity }): AuditResult` where `AuditResult` has `forbiddenLegacy`, `invalidCompatibility`, and `scannedFiles`.
- Produces: root commands `brand:audit`, `identity:check`, and `identity:test`; both validators accept `--scope product|infra|all` and default to `all`.

- [ ] **Step 1: Write failing manifest and audit tests**

Create tests that assert the canonical values, exact immutable list, exact migration-only origins, and deep-link list. In `scripts/brand-audit.test.mjs`, use temporary fixtures and pin these behaviors:

```js
test("scans compound environment examples from the tracked-file list", () => {
  const result = auditTrackedFiles(fixture({
    files: ["docker/.env.prod.example"],
    contents: { "docker/.env.prod.example": "APP_URL=https://mettlelift.example" },
  }));
  assert.equal(result.forbiddenLegacy.length, 1);
});

test("does not scan an untracked agent artifact", () => {
  const result = auditTrackedFiles(fixture({
    files: ["README.md"],
    contents: {
      "README.md": "Zor",
      ".claude/worktrees/report.md": "Mettle Lift",
    },
  }));
  assert.deepEqual(result.forbiddenLegacy, []);
});

test("allows only exact immutable and migration literals at exact paths", () => {
  const ok = auditTrackedFiles(fixture({
    files: ["apps/mobile/app.config.js", "apps/mobile/lib/database-readiness.ts"],
    contents: {
      "apps/mobile/app.config.js": 'const id = "com.ironpulse.app"',
      "apps/mobile/lib/database-readiness.ts": 'const old = "ironpulse.db"',
    },
  }));
  assert.deepEqual(ok.invalidCompatibility, []);
});
```

- [ ] **Step 2: Run the tests and confirm the intended failures**

Run: `node --test scripts/brand-audit.test.mjs scripts/validate-zor-identity.test.mjs && pnpm --filter @zor/shared test -- identity.test.ts`

Expected: FAIL because the manifest and exported audit functions do not exist.

- [ ] **Step 3: Add the manifest and typed projection**

Use this stable shape so scripts and apps do not invent parallel constants:

```json
{
  "product": { "displayName": "Zor", "storeName": "Zor Fitness" },
  "origins": {
    "production": "https://zor.hiten-patel.co.uk",
    "staging": "https://staging.zor.hiten-patel.co.uk",
    "development": "https://zor.local"
  },
  "repositories": {
    "forgejo": "hiten/Zor",
    "github": "hitenpatel/Zor",
    "image": "git.hiten-patel.co.uk/hiten/zor"
  },
  "infrastructure": {
    "composeProduction": "zor-prod",
    "composeStaging": "zor-staging",
    "service": "zor",
    "postgresRole": "zor",
    "postgresDatabase": "zor",
    "postgresTestDatabase": "zor_test",
    "minioBucket": "zor",
    "backupPrefix": "zor_",
    "deployLock": "/tmp/zor-deploy.lock"
  },
  "mobile": {
    "powerSyncDatabase": "zor.db",
    "deepLinkSchemes": ["zor"],
    "easProjectId": "a4541ea9-4c09-42bf-8ae6-f12a5ebb81e3"
  },
  "immutableCompatibility": {
    "applicationIds": ["com.ironpulse.app", "com.ironpulse.app.e2e"],
    "iapProductIds": [
      "com.ironpulse.athlete.monthly",
      "com.ironpulse.athlete.yearly",
      "com.ironpulse.coach.monthly",
      "com.ironpulse.coach.yearly"
    ]
  },
  "migrationOnly": {
    "legacyOrigins": {
      "https://ironpulse.hiten-patel.co.uk": "https://zor.hiten-patel.co.uk",
      "https://staging.ironpulse.hiten-patel.co.uk": "https://staging.zor.hiten-patel.co.uk",
      "https://mettlelift.hiten-patel.co.uk": "https://zor.hiten-patel.co.uk",
      "https://staging.mettlelift.hiten-patel.co.uk": "https://staging.zor.hiten-patel.co.uk"
    },
    "powerSyncDatabase": "ironpulse.db",
    "repositories": ["hiten/IronPulse", "hitenpatel/IronPulse"],
    "image": "git.hiten-patel.co.uk/hiten/mettlelift",
    "composeProjects": ["mettlelift-prod", "mettlelift-staging"],
    "service": "ironpulse",
    "postgres": { "role": "ironpulse", "databases": ["ironpulse", "ironpulse_test"] },
    "minioBucket": "ironpulse",
    "backupPrefix": "ironpulse_",
    "deepLinkScheme": "ironpulse",
    "developmentOrigin": "https://ironpulse.local",
    "deployLock": "/tmp/mettlelift-deploy.lock",
    "productionVolumes": [
      "ironpulse-production_production-pgdata",
      "ironpulse-production_production-miniodata",
      "ironpulse-production_production-redisdata"
    ]
  }
}
```

`identity.ts` imports the JSON and exports `IDENTITY` with `as const`-equivalent readonly typing plus named selectors `CANONICAL_ORIGINS`, `IMMUTABLE_APPLICATION_IDS`, and `MIGRATION_ONLY_ORIGINS`. Export those from `index.ts`.

- [ ] **Step 4: Implement Git-index enumeration and exact compatibility matching**

The CLI must call:

```js
const output = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT });
const files = output.toString("utf8").split("\0").filter(Boolean);
```

`isScannablePath()` must accept `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.json`, `.md`, `.yaml`, `.yml`, `.sh`, `.plist`, `.xml`, `.gradle`, `.conf`, `Dockerfile`, `Caddyfile.dev`, and every filename ending in `.env.example`, including `.env.prod.example` and `.env.staging.example`.

Make `brand-history.json` an exact array of frozen files returned by:

```bash
git grep -Il -E 'Mettle[[:space:]]*Lift|mettlelift|IronPulse|ironpulse' -- \
  CHANGELOG.md docs/adr docs/superpowers/plans docs/superpowers/specs designs \
  | LC_ALL=C sort
```

Append only exact `backlog/tasks/*.md` paths whose IDs are reported as `Done` by `backlog task list --status Done --plain`; this preserves closed-task provenance without treating the backlog directory as historical. Do not include active backlog items, `.forgejo/`, runbooks, examples, or deployment files. The allowlist contains only exact path/pattern/reason entries for application IDs, IAP IDs, the EAS UUID, migration-only literals, and encoded audit-test fixtures. Remove all mutable infrastructure exceptions.

- [ ] **Step 5: Implement identity validation**

`validate-zor-identity.mjs` reads the manifest and evaluates Expo config twice under a restored environment: once with `EXPO_PUBLIC_E2E=0` and once with `EXPO_PUBLIC_E2E=1`, passing `{ name: "", slug: "" }` as the Expo config input. It renders all supported Compose combinations and checks repository URLs, image names, origins, service names, database defaults, bucket defaults, backup prefix, deep-link schemes, bundle IDs, IAP IDs, and EAS UUID. It prints one error per mismatch and exits nonzero. Its `--scope` parser uses `all` by default; product checks cover mobile/web/docs/backlog, while infra checks cover Docker/workflows/migration utilities.

Keep `branding:check` as the distinct visual-asset integrity gate. Make `verify-zor-assets.mjs` read `identity.json`, require `product.displayName === "Zor"`, require the asset manifest generator `zor-assets-v1`, and verify that every required source/output path uses the canonical `zor-` naming. `identity:test` includes a fixture proving that a mismatched identity/asset manifest fails.

Add scripts:

```json
{
  "brand:audit": "node scripts/brand-audit.mjs",
  "identity:check": "node scripts/validate-zor-identity.mjs",
  "identity:test": "node --test scripts/brand-audit.test.mjs scripts/validate-zor-identity.test.mjs"
}
```

- [ ] **Step 6: Run focused tests**

Run: `pnpm identity:test && pnpm branding:check && pnpm --filter @zor/shared test -- identity.test.ts`

Expected: PASS. `pnpm identity:check` is expected to FAIL here and list the still-legacy active configurations; Task 2 consumes that failure list.

- [ ] **Step 7: Commit**

```bash
git add package.json packages/shared/src scripts/brand-audit.mjs scripts/brand-audit.test.mjs scripts/brand-allowlist.json scripts/brand-history.json scripts/lib scripts/validate-zor-identity.mjs scripts/validate-zor-identity.test.mjs scripts/verify-zor-assets.mjs
git commit -m "feat(brand): establish canonical Zor identity contract"
```

### Task 2: Active product, repository, and integration branding

**Files:**
- Modify: `apps/mobile/app.config.js`
- Modify: `apps/mobile/eas.json`
- Modify: `apps/mobile/react-native.config.js`
- Modify: `apps/mobile/lib/config.ts`
- Modify: `apps/mobile/lib/gps-task.ts`
- Modify: `apps/mobile/lib/healthkit.ts`
- Modify: `apps/mobile/lib/googlefit.ts`
- Modify: `apps/mobile/lib/__tests__/healthkit.test.ts`
- Modify: `apps/mobile/lib/__tests__/googlefit.test.ts`
- Create: `apps/mobile/lib/__tests__/identity-config.test.ts`
- Modify: `apps/mobile/components/__tests__/app-server-gate.test.tsx`
- Modify: `apps/mobile/lib/__tests__/server.test.ts`
- Modify: `apps/web/src/app/page.tsx`
- Modify: `README.md`
- Modify: `docker/README.md`
- Modify: `test-paths.md`
- Modify: `.forgejo/workflows/maestro-nightly.yml`
- Modify through Backlog CLI: every active task reported by the new audit

**Interfaces:**
- Consumes: `IDENTITY` selectors from Task 1.
- Produces: active Expo/store/repository/integration configuration with no mutable legacy aliases.

- [ ] **Step 1: Tighten existing tests around immutable identifiers**

Change the HealthKit and Google Fit assertions to `com.ironpulse.app`, add negative assertions for `com.zor.app`, and extend the config test:

```ts
expect(config.slug).toBe("zor");
expect(config.scheme).toEqual(["zor"]);
expect(config.android.package).toBe("com.ironpulse.app");
expect(config.ios.bundleIdentifier).toBe("com.ironpulse.app");
expect(config.extra.eas.projectId).toBe("a4541ea9-4c09-42bf-8ae6-f12a5ebb81e3");
```

Add a static assertion that React Native CLI uses `packageName: 'com.ironpulse.app'`.

- [ ] **Step 2: Run tests and identity validation to capture failures**

Run: `pnpm --filter @zor/mobile exec vitest run lib/__tests__/healthkit.test.ts lib/__tests__/googlefit.test.ts lib/__tests__/identity-config.test.ts && pnpm identity:check`

Expected: FAIL on `com.zor.app`, `slug: ironpulse`, the legacy deep-link alias, old origins, repository paths, and active copy.

- [ ] **Step 3: Normalize application and repository presentation**

Set Expo `slug: "zor"`, `scheme: ["zor"]`, canonical production/staging URLs, and canonical repository links. Set `react-native.config.js` to the immutable shipping package. Make the no-op GPS adapter receive `IDENTITY.mobile.powerSyncDatabase` instead of a literal without changing the stub implementation or activating persistence. Replace active comments and docs that call the app IronPulse or Mettle Lift with Zor, while retaining exact immutable identifiers where technically required.

For active backlog items, read each record with `backlog task view TASK-ID --plain`, replace current product/repository/domain/service references while preserving historical commit descriptions, and write the updated structured field with `backlog task edit TASK-ID --description "$DESCRIPTION" --plain`. Never edit task Markdown directly. Closed task paths remain exact entries in `brand-history.json`; do not classify the whole backlog as history.

- [ ] **Step 4: Verify all active text is clean**

Run the product-scoped checks:

```bash
pnpm identity:check -- --scope product
pnpm brand:audit -- --scope product
pnpm --filter @zor/mobile exec vitest run lib/__tests__/healthkit.test.ts lib/__tests__/googlefit.test.ts lib/__tests__/identity-config.test.ts lib/__tests__/server.test.ts
```

Expected: all product checks PASS. The full `pnpm brand:audit` remains red only for the Docker/workflow/server-migration paths owned by Tasks 6–8; save that exact residual list and reject any product-path regression.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile apps/web/src/app/page.tsx README.md docker/README.md test-paths.md .forgejo/workflows/maestro-nightly.yml backlog packages/shared scripts
git commit -m "fix(brand): complete active Zor product identity"
```

### Task 3: Mobile managed-origin migration and startup gate

**Files:**
- Create: `apps/mobile/lib/startup.ts`
- Create: `apps/mobile/lib/__tests__/startup.test.ts`
- Modify: `apps/mobile/lib/server.ts`
- Modify: `apps/mobile/lib/__tests__/server.test.ts`
- Modify: `apps/mobile/lib/auth.tsx`
- Modify: `apps/mobile/App.tsx`
- Modify: `apps/mobile/components/__tests__/app-server-gate.test.tsx`

**Interfaces:**
- Produces: `migrateManagedOrigin(url: string): string`.
- Produces: `prepareOriginStartup(): Promise<void>`.
- Produces: a `StartupGate` that renders children only after origin readiness resolves; Task 4 extends it with database readiness.

- [ ] **Step 1: Write URL mapping and ordering tests**

Cover all four exact legacy origins, trailing-slash comparison, repeated calls, arbitrary HTTPS self-hosted URLs, local HTTP URLs, SecureStore read errors, URL write errors, and marker write errors. Pin ordering with spies:

```ts
expect(events).toEqual([
  "origin:read",
  "origin:write",
  "origin:marked",
  "auth:mounted",
]);
```

The URL-write-error case must assert that the completion marker is absent and the original persisted URL is unchanged. The marker-write-error case must assert that the canonical URL is persisted, the marker is absent, and the next startup retries only the marker write.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm --filter @zor/mobile test:unit -- server.test.ts startup.test.ts`

Expected: FAIL because managed-origin migration and `prepareOriginStartup` do not exist.

- [ ] **Step 3: Implement the exact migration map**

Read the mapping from `MIGRATION_ONLY_ORIGINS`. In `hydrateServerUrl()`, when `server-url` is found, normalize it, map only an exact legacy/migration-only origin (ignoring a trailing slash), persist the target, then persist marker `zor-origin-migration-v1=complete`. Update the in-memory cache only after both writes succeed. Self-hosted values return byte-for-byte except for the normalization behavior already promised by `normalizeServerUrl`.

- [ ] **Step 4: Gate authentication and networking**

Move startup hydration out of `AuthProvider`. `StartupGate` awaits `prepareOriginStartup()`. Mount `AuthProvider` and `RootNavigator` only after success. A failure screen must show “Zor could not safely prepare local data”, expose a retry button, and never construct tRPC while failed. Task 4 adds database readiness and PowerSync construction to the same gate.

- [ ] **Step 5: Run focused mobile tests**

Run: `pnpm --filter @zor/mobile test:unit -- server.test.ts startup.test.ts && pnpm --filter @zor/mobile test:components -- app-server-gate.test.tsx`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/mobile/App.tsx apps/mobile/lib/auth.tsx apps/mobile/lib/server.ts apps/mobile/lib/startup.ts apps/mobile/lib/__tests__/server.test.ts apps/mobile/lib/__tests__/startup.test.ts apps/mobile/components/__tests__/app-server-gate.test.tsx
git commit -m "feat(mobile): migrate managed origins before startup"
```

### Task 4: Process-safe mobile PowerSync database migration

**Files:**
- Create: `apps/mobile/modules/zor-database-files/expo-module.config.json`
- Create: `apps/mobile/modules/zor-database-files/index.ts`
- Create: `apps/mobile/modules/zor-database-files/src/ZorDatabaseFiles.types.ts`
- Create: `apps/mobile/modules/zor-database-files/src/ZorDatabaseFilesModule.ts`
- Create: `apps/mobile/modules/zor-database-files/android/build.gradle`
- Create: `apps/mobile/modules/zor-database-files/android/src/main/AndroidManifest.xml`
- Create: `apps/mobile/modules/zor-database-files/android/src/main/java/com/zor/databasefiles/ZorDatabaseFilesModule.kt`
- Create: `apps/mobile/modules/zor-database-files/ios/ZorDatabaseFilesModule.swift`
- Create: `apps/mobile/modules/zor-database-files/ios/ZorDatabaseFiles.podspec`
- Create: `apps/mobile/lib/database-readiness.ts`
- Create: `apps/mobile/lib/__tests__/database-readiness.test.ts`
- Modify: `apps/mobile/lib/powersync.ts`
- Modify: `apps/mobile/App.tsx`

**Interfaces:**
- Produces native `ensureReady(options: DatabaseMigrationOptions): Promise<DatabaseMigrationResult>`.
- Produces JS `ensureDatabaseReady(): Promise<"zor.db">`, protected by a singleton promise plus native in-process and cross-process locks.
- Changes `getPowerSyncDatabase()` to `getPowerSyncDatabase(databaseName: "zor.db"): any`.
- Produces `prepareAppStartup(): Promise<{ databaseName: "zor.db" }>` which composes, rather than renames, `prepareOriginStartup()`.
- Emits `DatabaseMigrationProgress` events while native I/O runs off the UI thread.

Use these types exactly:

```ts
export interface DatabaseMigrationOptions {
  source: "ironpulse.db";
  destination: "zor.db";
  temporary: "zor.db.migrating";
  lock: "zor-database-migration.lock";
}

export interface DatabaseMigrationResult {
  databaseName: "zor.db";
  migrated: boolean;
  integrity: "ok";
  pendingUploadRows: number;
}

export interface DatabaseMigrationProgress {
  phase: "checkpoint" | "copy" | "validate" | "promote";
  bytesCopied: number;
  totalBytes: number;
}
```

- [ ] **Step 1: Write the JS state-machine tests**

Inject a `DatabaseFilesAdapter` and cover fresh install, old only, valid destination only, both names, old WAL/SHM, interrupted promotion, invalid destination, repeated startup, source preservation on error, and two concurrent same-runtime callers. The error test must assert no call to `openPowerSync("zor.db")` occurs. A progress test feeds a multi-chunk copy and asserts monotonic `bytesCopied`, an event-loop heartbeat, and a final `bytesCopied === totalBytes`.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm --filter @zor/mobile test:unit -- database-readiness.test.ts`

Expected: FAIL because `ensureDatabaseReady` and its adapter do not exist.

- [ ] **Step 3: Implement the local Expo module**

Register the module as `ZorDatabaseFiles`. Android resolves the same default directory as Quick SQLite with `context.filesDir`; a companion-object `ReentrantLock` serializes calls inside the JVM before a `FileChannel.lock()` protects other processes. It uses `android.database.sqlite.SQLiteDatabase` on absolute paths, `android.system.Os.fsync`, and `android.system.Os.rename`. iOS resolves Quick SQLite's configured App Group container when `ReactNativeQuickSQLite_AppGroup` is set and otherwise uses `NSDocumentDirectory`; a serial dispatch queue protects in-process calls before `flock(LOCK_EX)` protects other processes, followed by sqlite3, `fsync`, and POSIX `rename` on the same filesystem. Copying runs on an I/O executor/queue and emits progress to JavaScript.

Both platforms execute this exact state machine while holding the native lock:

1. If destination exists, run `PRAGMA quick_check`, require result `ok`, require `ps_crud` and `ps_buckets` when the file is nonempty, count `ps_crud`, remove a stale temporary file, and return it.
2. If neither source nor destination exists, create an empty SQLite destination, require `PRAGMA quick_check = 'ok'`, and return `migrated: false` with zero pending rows; PowerSync creates its metadata on first open.
3. If source exists, open it with an exclusive locking mode; run `PRAGMA wal_checkpoint(TRUNCATE)` and require a non-busy result; run `PRAGMA quick_check`; require `ps_crud` and `ps_buckets`; record pending `ps_crud` count, then close the source.
4. While the JavaScript/native/file migration locks remain held and before any PowerSync construction, copy the quiescent main file to the temporary path. Never copy `-shm`. Fsync the temporary file and its parent directory.
5. Validate the temporary database, including the same metadata tables and pending-upload count. Counts must match the source.
6. Atomically rename temporary to destination and validate destination again.
7. Close source, then remove source main/WAL/SHM. On any error, close handles, delete only an invalid temporary/destination created by this attempt, retain every source file, and reject.

If both source and destination exist, a valid destination wins only when its metadata and pending count validate; otherwise reject and retain both for diagnosis.

- [ ] **Step 4: Route real PowerSync construction through readiness**

Leave `lib/sqlite.ts` as the existing no-op GPS adapter and do not add real GPS persistence or `_gps_buffer` to the PowerSync database. Task 2 removes its old filename literal from `gps-task.ts` without changing runtime behavior.

`powersync.ts` accepts the ready name and contains no string filename. `prepareAppStartup()` calls the still-public `prepareOriginStartup()`, then database readiness. `App.tsx` removes module-scope PowerSync construction; the startup effect awaits `prepareAppStartup()`, constructs PowerSync, and only then mounts authentication and renders its context. The startup screen shows migration phase and copied/total bytes while remaining responsive. Extend the Task 3 ordering test to require `origin:marked`, `database:ready`, `powersync:constructed`, then `auth:mounted`. Add a static identity assertion with an exact exception set for `identity.json`, `database-readiness.ts`, native migration sources, and migration test fixtures; every other mobile database filename literal fails.

- [ ] **Step 5: Run unit and concurrency tests**

Run:

```bash
pnpm --filter @zor/mobile test:unit -- database-readiness.test.ts powersync.test.ts
pnpm --filter @zor/mobile test:components
pnpm identity:check -- --scope product
```

Expected: PASS; same-runtime concurrent calls result in one migration and two `zor.db` results, and the progress test proves the JavaScript event loop is not blocked.

- [ ] **Step 6: Run native prebuild and device migration checks**

Precondition: reserve a macOS host or device-farm slot with the required Xcode/iOS runtime before starting this step. If none is available, the release candidate remains blocked at this step; iOS verification is not converted into a documentation-only deferral.

Run:

```bash
cd apps/mobile
npx expo prebuild --platform android --clean --no-install
EXPO_PUBLIC_E2E=1 npx expo run:android --variant debug
```

Seed an old PowerSync database with one uniquely identifiable application row and one pending `ps_crud` row, relaunch, and verify through an E2E-only diagnostic screen that filename is `zor.db`, `PRAGMA quick_check` is `ok`, and both unique rows remain. Run a cross-process contention fixture and a 512 MiB seeded-database copy while the screen heartbeat continues. Repeat on an iOS simulator with `npx expo prebuild --platform ios --clean --no-install && npx expo run:ios`. Capture commands/results in `docs/runbooks/evidence/zor-client-migration.md`. Neither platform may be marked deferred.

- [ ] **Step 7: Commit**

```bash
git add apps/mobile/App.tsx apps/mobile/modules apps/mobile/lib/database-readiness.ts apps/mobile/lib/powersync.ts apps/mobile/lib/__tests__ docs/runbooks/evidence/zor-client-migration.md
git commit -m "feat(mobile): migrate PowerSync storage safely to Zor"
```

### Task 5: Web PowerSync IndexedDB migration

**Files:**
- Create: `apps/web/src/lib/powersync/indexeddb-migration.ts`
- Create: `apps/web/src/lib/powersync/__tests__/indexeddb-migration.test.ts`
- Create: `apps/web/e2e/powersync-indexeddb-migration.spec.ts`
- Modify: `apps/web/src/lib/powersync/system.ts`
- Modify: `apps/web/src/lib/powersync/provider.tsx`
- Modify: `apps/web/src/lib/__tests__/powersync-system.test.ts`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `migratePowerSyncIndexedDb(options): Promise<IndexedDbMigrationResult>`.
- Changes: `getPowerSyncDatabase(): Promise<PowerSyncDatabase>`.

```ts
export interface IndexedDbMigrationResult {
  databaseName: "zor.db";
  copied: boolean;
  sourceDeletion: "deleted" | "absent";
}
```

- [ ] **Step 1: Add deterministic IndexedDB tests**

Add `fake-indexeddb` as a web dev dependency. Tests create the same stores/indexes/version used by `IDBBatchAtomicVFS`, insert ArrayBuffer page records and metadata, and assert fresh install, old-only copy, repeated startup, interrupted target replacement, both names, exact record/key counts, and a blocked version-upgrade barrier. The blocked case must create no target and remain pending until the competing connection closes; it then snapshots the latest inserted record and completes exactly once.

- [ ] **Step 2: Run tests and confirm failure**

Run: `pnpm --filter @zor/web test -- indexeddb-migration.test.ts powersync-system.test.ts`

Expected: FAIL because the migration function is absent and `system.ts` still constructs synchronously.

- [ ] **Step 3: Implement a lock-protected schema-preserving copy**

Acquire `navigator.locks.request("zor-powersync-database-migration", { mode: "exclusive" }, ...)`. Detect source absence without accepting the empty database created by a probe. For an existing source, request `source.version + 1` before creating a target; this version-change barrier forces every tab/SharedWorker connection to close and gives the migration an exclusive source transaction. If `onblocked` fires, create no target, keep the startup maintenance screen active, broadcast `close-legacy-database`, and await the holder closing.

Inside the exclusive version-change transaction, snapshot every object store's schema, indexes, keys, and ArrayBuffer values, including records added before the barrier acquired. After the barrier transaction completes, close the source connection, recreate the prior data schema in the destination, copy all stores inside one destination read-write transaction, and compare per-store record counts and keys.

An existing destination is accepted only when the completion marker and store manifest match. A partial unmarked destination is deleted before the source barrier and recopied. After copy validation, delete the now-quiesced source and await `onsuccess` before writing localStorage marker `zor-powersync-idb-v1=validated`. An unexpected delete `onblocked` keeps the maintenance screen active and destination unmarked until the blocker closes; it never falls back to tRPC or constructs new PowerSync. Never activate the destination before source deletion succeeds.

- [ ] **Step 4: Make web PowerSync initialization asynchronous**

`getPowerSyncDatabase()` memoizes a promise, awaits the migration, then constructs `WASQLiteOpenFactory` with `dbFilename: IDENTITY.mobile.powerSyncDatabase`. The provider's existing timeout does not race an in-progress migration into tRPC mode; it shows migration progress or a close-other-tabs/retry message and constructs no new PowerSync worker until migration succeeds.

- [ ] **Step 5: Run web tests**

Run: `pnpm --filter @zor/web test -- indexeddb-migration.test.ts powersync-system.test.ts && pnpm --filter @zor/web lint && pnpm --filter @zor/web exec playwright test e2e/powersync-indexeddb-migration.spec.ts`

Expected: PASS. The Playwright test opens two tabs using the real PowerSync SharedWorker, proves migration remains pending with no target while the worker owns the source, inserts a final legacy record, closes both legacy tabs, then proves the barrier snapshots that record and activates only `zor.db`.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/powersync apps/web/src/lib/__tests__/powersync-system.test.ts apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): preserve PowerSync data during Zor rename"
```

### Task 6: Zor green-stack configuration and exact runtime tooling

**Files:**
- Modify: `docker/docker-compose.yml`
- Modify: `docker/docker-compose.dev.yml`
- Modify: `docker/docker-compose.e2e.yml`
- Modify: `docker/compose.prod.yml`
- Modify: `docker/compose.staging.yml`
- Modify: `docker/traefik-dev-dynamic.yml`
- Modify: `docker/Caddyfile.dev`
- Modify: `docker/powersync.yaml`
- Modify: `docker/.env.example`
- Modify: `docker/.env.prod.example`
- Modify: `docker/.env.staging.example`
- Modify: `docker/e2e.env`
- Modify: `.env.example`
- Modify: `scripts/dev-start.sh`
- Modify: `scripts/dev-db.sh`
- Modify: `docker/Dockerfile`
- Modify: `docker/entrypoint.sh`
- Modify: `docker/remote-deploy.sh`
- Create: `scripts/compose-config.test.mjs`

**Interfaces:**
- Produces services addressed as `zor`, canonical project/volume/network/router names, and environment-parameterized origins.
- Produces runtime Prisma commands resolved from the workspace lockfile, never a separately installed global version.

- [ ] **Step 1: Write rendered-Compose assertions**

For base+dev, base+E2E, base+staging, and base+prod, invoke `docker compose config --format json` with fixture environment values. Assert service `zor`, canonical default DB/bucket names, canonical explicit volume names, expected origins, no legacy mutable name, and no blue external volume attached to green.

- [ ] **Step 2: Run the test and confirm failure**

Run: `node --test scripts/compose-config.test.mjs`

Expected: FAIL on service, project, image, router, hostname, volumes, database, and bucket identifiers.

- [ ] **Step 3: Rename all mutable runtime identifiers**

Use `zor` for service/container/router/network names, `zor-prod`/`zor-staging` for project names, named green volumes prefixed `zor-*`, canonical image/origins, PostgreSQL role/database defaults, and MinIO bucket. Replace `ironpulse.local` with `zor.local`. Update PowerSync JWKS and cron URLs to `http://zor:3000`.

Do not attach `ironpulse-production_*` or Mettle Lift volumes in green. Blue data enters green only through Task 7's explicit restore/mirror commands.

- [ ] **Step 4: Remove the independent Prisma installation**

Delete `RUN npm install -g prisma@6.3`. Ensure the runner includes the workspace `.pnpm` store and package binaries, and invoke:

```sh
pnpm --filter @zor/db exec prisma migrate deploy
pnpm --filter @zor/db exec prisma db execute --schema packages/db/prisma/schema.prisma --file packages/db/prisma/powersync-triggers.sql
```

CI and production must use `migrate deploy`; only explicitly disposable dev/E2E stacks may use `db push`.

- [ ] **Step 5: Verify Compose and image construction**

Run:

```bash
node --test scripts/compose-config.test.mjs
docker compose -f docker/docker-compose.yml -f docker/docker-compose.dev.yml config >/dev/null
IMAGE_TAG=test docker compose -f docker/docker-compose.yml -f docker/compose.staging.yml config >/dev/null
IMAGE_TAG=test docker compose -f docker/docker-compose.yml -f docker/compose.prod.yml config >/dev/null
docker build -f docker/Dockerfile --target runner -t zor:plan-verification .
```

Expected: all PASS; `docker run --rm zor:plan-verification pnpm --filter @zor/db exec prisma --version` reports the lockfile-resolved version.

- [ ] **Step 6: Commit**

```bash
git add docker .env.example scripts/dev-start.sh scripts/dev-db.sh scripts/compose-config.test.mjs
git commit -m "feat(infra): provision canonical Zor green stack"
```

### Task 7: PostgreSQL, MinIO, Redis, and backup migration utilities

**Files:**
- Create: `scripts/zor-cutover/lib/runner.mjs`
- Create: `scripts/zor-cutover/lib/arguments.mjs`
- Create: `scripts/zor-cutover/postgres.mjs`
- Create: `scripts/zor-cutover/minio.mjs`
- Create: `scripts/zor-cutover/redis-inventory.mjs`
- Create: `scripts/zor-cutover/powersync-concurrency.mjs`
- Create: `scripts/zor-cutover/validate.mjs`
- Create: `scripts/zor-cutover/__tests__/postgres.test.mjs`
- Create: `scripts/zor-cutover/__tests__/minio.test.mjs`
- Create: `scripts/zor-cutover/__tests__/redis-inventory.test.mjs`
- Create: `scripts/zor-cutover/__tests__/powersync-concurrency.test.mjs`
- Create: `scripts/zor-cutover/sql/validate-postgres.sql`
- Create: `docker/powersync-concurrency-sampler.service`
- Modify: `docker/backup.sh`
- Modify: `docker/restore.sh`
- Modify: `docker/verify-backup.sh`
- Modify: `docker/verify-backup.service`
- Modify: `docker/verify-backup.timer`
- Modify: `package.json`

**Interfaces:**
- Produces CLIs with `preflight`, `migrate`, and `validate`; none expose `cleanup`.
- Every mutating invocation requires explicit `--source`, `--target`, `--backup-marker`, and either `--dry-run` or `--execute`.
- Produces deterministic JSON manifests for PostgreSQL validation and MinIO objects.

- [ ] **Step 1: Write command-construction and fail-closed tests**

Use a fake runner that records argv arrays. Assert `pg_dump --format=custom`, `pg_restore --no-owner`, target-only ownership SQL, workspace Prisma invocation, no `DROP`, and no source connection passed to mutating SQL. Assert missing source/target/marker or identical source/target exits before runner invocation.

MinIO tests use synthetic listings to assert sorted keys, version IDs, sizes, metadata, SHA-256 values, multipart ETags being rejected as hashes, streamed-hash fallback, and zero-object success only when both manifests are empty.

Redis tests reject any key without an allowed disposable category, any queue/list/stream without an explicit reconstruction rule, and any session/denylist key. PowerSync concurrency tests parse synthetic `/proc/<pid>/net/tcp{,6}` rows, count established connections to local port 80, reject a seven-day sample with a gap over 60 seconds, and return the exact peak for a complete sample.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test scripts/zor-cutover/__tests__/*.test.mjs`

Expected: FAIL because the CLIs and runner do not exist.

- [ ] **Step 3: Implement PostgreSQL migration and validation**

`postgres.mjs migrate` creates the target role/database, restores a custom dump with `--no-owner`, applies schema/object ownership only on target, then runs the workspace-pinned `prisma migrate deploy`. `validate-postgres.sql` returns one JSON object containing extension, table, row-count, foreign-key, sequence, publication, replication-slot, PowerSync-trigger, and `_prisma_migrations` summaries.

`validate.mjs` compares source/target table row counts, verifies constraints/sequences/publications, then invokes the existing API integration tests for auth, profiles, workout/set/cardio/body/sleep/nutrition, coaching/social/challenge/notification/message, uploads, webhooks, worker dispatch, and workout finalization.

- [ ] **Step 4: Implement MinIO mirror and manifests**

Use `mc mirror --preserve --overwrite` for copy/delta. Build manifests with `mc stat --json --versions`; stream each object through SHA-256 when a version lacks a trustworthy checksum or has a multipart ETag. Compare exact sorted tuples `(key, versionId, size, metadata, sha256)`. Exit nonzero on one mismatch.

- [ ] **Step 5: Extend backup/restore to both authoritative stores**

New backups are `zor_YYYYMMDDTHHMMSSZ.pgdump` plus `zor_YYYYMMDDTHHMMSSZ.minio-manifest.json` and a version-preserving MinIO mirror directory. Restore accepts an explicitly supplied legacy archive filename but discovery only selects `zor_*`. Verification restores PostgreSQL and MinIO into isolated names, compares their manifests, and removes only its isolated verification targets.

- [ ] **Step 6: Implement measured PowerSync concurrency evidence**

`powersync-concurrency.mjs sample` resolves the container PID with `docker inspect`, reads `/proc/<pid>/net/tcp` and `tcp6` every 15 seconds, counts state `01` sockets whose local port is hex `0050`, and appends `{ sampledAt, establishedClients }` JSONL with an fsync after every record. The systemd service runs it continuously for at least seven complete days before preflight. `powersync-concurrency.mjs evaluate` rejects missing/duplicate timestamps and gaps over 60 seconds, then emits `{ windowStart, windowEnd, samples, peak, requiredRehearsalClients: Math.max(25, 2 * peak), sha256 }`.

- [ ] **Step 7: Run utility tests and a disposable rehearsal**

Run:

```bash
node --test scripts/zor-cutover/__tests__/*.test.mjs
pnpm zor-cutover:postgres -- preflight --source "$SOURCE_DATABASE_URL" --target "$TARGET_DATABASE_URL" --backup-marker "$MARKER" --dry-run
pnpm zor-cutover:minio -- preflight --source old/ironpulse --target green/zor --backup-marker "$MARKER" --dry-run
```

Expected: unit tests PASS; dry runs print shell-escaped argv and make no changes. Then run execute/validate against disposable containers and retain manifests under `docs/runbooks/evidence/rehearsal/`.

- [ ] **Step 8: Commit**

```bash
git add scripts/zor-cutover docker/backup.sh docker/restore.sh docker/verify-backup.sh docker/verify-backup.service docker/verify-backup.timer docker/powersync-concurrency-sampler.service package.json docs/runbooks/evidence/rehearsal
git commit -m "feat(migration): add verified Zor data cutover tools"
```

### Task 8: Blue-green orchestration, external cutover, and guarded retirement

**Files:**
- Create: `scripts/zor-cutover/preflight.mjs`
- Create: `scripts/zor-cutover/collect-retirement-evidence.mjs`
- Create: `scripts/zor-cutover/retire.mjs`
- Create: `scripts/zor-cutover/__tests__/preflight.test.mjs`
- Create: `scripts/zor-cutover/__tests__/collect-retirement-evidence.test.mjs`
- Create: `scripts/zor-cutover/__tests__/retire.test.mjs`
- Create: `docs/runbooks/zor-hard-cutover.md`
- Create: `docs/runbooks/zor-external-systems-checklist.md`
- Modify: `docker/remote-deploy.sh`
- Modify: `.forgejo/workflows/deploy.yml`
- Modify: `.forgejo/workflows/ci.yml`
- Modify: `.forgejo/workflows/maestro-nightly.yml`

**Interfaces:**
- Produces a read-only machine preflight report with pass/fail evidence.
- Produces a retirement CLI that cannot act before the explicit seven-day evidence and verified-backup gates.
- Leaves DNS, repository, provider, and store mutations as explicit runbook operator actions with pre/post checks.

- [ ] **Step 1: Write preflight and retirement guard tests**

Pin these failures before any command runner call: missing mobile Android/iOS evidence, Zor origin unhealthy on blue, image digest not pullable, Redis inventory incomplete, PowerSync load below threshold, old/new deploy locks not both acquired during transition, retirement before 168 hours, availability below 99.9%, unresolved high/critical Sentry issue, missing scheduled-job cadence, nonempty unresolved sync backlog, dirty PostgreSQL/MinIO validation, or missing post-cutover restore proof.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test scripts/zor-cutover/__tests__/preflight.test.mjs scripts/zor-cutover/__tests__/collect-retirement-evidence.test.mjs scripts/zor-cutover/__tests__/retire.test.mjs`

Expected: FAIL because preflight and retirement commands do not exist.

- [ ] **Step 3: Implement the guarded state transitions**

`preflight.mjs` consumes only evidence emitted by checked-in collectors and emits a single report; it performs probes only. `collect-retirement-evidence.mjs` queries the configured health-monitoring API, Sentry API, scheduled-job status endpoint, PowerSync backlog source, PostgreSQL validator, MinIO manifest validator, and restore-evidence store for the exact UTC cutover window. For every input it records source identifier, query/arguments, window, retrieval time, raw-response SHA-256, and evaluated result. Missing credentials, stale windows, gaps, or a record without provenance fail collection.

`retire.mjs` requires `--cutover-at`, collector-produced `--health-evidence`, `--verified-backup-marker`, explicit source names, and `--execute`. It verifies the evidence schema and hashes, re-runs live probes available at retirement time, refuses broad/glob/root targets, and calls cleanup operations only after every gate passes. Unit tests prove a hand-authored status-only JSON file is rejected.

During deploy-lock transition, `remote-deploy.sh` acquires both `/tmp/mettlelift-deploy.lock` and `/tmp/zor-deploy.lock` in a stable lexical order. The runbook records the one release after which workflows use only `/tmp/zor-deploy.lock`; the legacy literal remains migration-only in this script until that release is tagged.

- [ ] **Step 4: Write the exact operator runbook**

The runbook assigns an owner and command/evidence field to every preflight and cutover step. It includes: TTL reduction to 300 seconds; Zor origins routed to blue before mobile submission; both store releases; multi-architecture Zor image pull by digest before repository rename; Forgejo/GitHub rename verification; local remote/mirror/badge/issue-link updates; maintenance write block; final PG/MinIO copy; Redis/Mongo/PowerSync rebuild; staged client reopen; DNS/TLS; OAuth; HealthKit/Google Fit; Stripe; email; monitoring; EAS metadata; public smoke; pre-write server rollback; one-way client migration behavior; post-write roll-forward; and seven-day retirement.

Before removing `ironpulse://`, inventory email templates, queued/stored notification payloads, OAuth registrations, and provider callbacks. Update every emitter before mobile release and record the maximum lifetime or accepted breakage of already-issued links; the absence of a runtime alias is an explicit hard-cutover consequence.

The four legacy domains are migration inputs only. The runbook explicitly removes their DNS/routes/callbacks after the rollback period and does not describe redirects or aliases.

- [ ] **Step 5: Update workflows and repository paths**

Use `git.hiten-patel.co.uk/hiten/zor`, `hiten/Zor`, `hitenpatel/Zor`, canonical origins, service `zor`, and lock `/tmp/zor-deploy.lock` after the transition tag. Build/push both architectures, create and inspect the manifest, pull by digest, then permit the repository rename operator step.

- [ ] **Step 6: Verify the runbook gates**

Run:

```bash
node --test scripts/zor-cutover/__tests__/preflight.test.mjs scripts/zor-cutover/__tests__/collect-retirement-evidence.test.mjs scripts/zor-cutover/__tests__/retire.test.mjs
pnpm brand:audit
pnpm identity:check
```

Expected: PASS. Manually verify every external-system checklist row has owner, precondition, action, postcondition, abort criterion, and evidence location.

- [ ] **Step 7: Commit**

```bash
git add scripts/zor-cutover docs/runbooks docker/remote-deploy.sh .forgejo/workflows
git commit -m "docs(ops): codify guarded Zor blue-green cutover"
```

### Task 9: CI gates and PowerSync resynchronization rehearsal

**Files:**
- Modify: `.forgejo/workflows/ci.yml`
- Modify: `.forgejo/workflows/maestro-nightly.yml`
- Create: `scripts/zor-cutover/powersync-rehearsal.mjs`
- Create: `scripts/zor-cutover/__tests__/powersync-rehearsal.test.mjs`
- Modify: `package.json`
- Modify: `packages/db/package.json`

**Interfaces:**
- Produces a required CI gate covering all six workspaces, brand/identity, builds, browser E2E/a11y, Android flows, and migration paths.
- Produces a PowerSync rehearsal report with client count, unique mutation IDs, drain durations, missing IDs, duplicate application rows, and unresolved errors.

- [ ] **Step 1: Write rehearsal acceptance tests**

Feed synthetic reports and Task 7 concurrency evidence into `evaluateRehearsal(report, concurrencyEvidence)`. Assert missing provenance or an incomplete seven-day window fails; 24 clients fail when the floor is 25; `2 × peak` overrides the floor; nine mutations on one client fail; a 301-second drain fails; and any duplicate, missing mutation, or unresolved error fails.

- [ ] **Step 2: Run tests and confirm failure**

Run: `node --test scripts/zor-cutover/__tests__/powersync-rehearsal.test.mjs`

Expected: FAIL because the evaluator does not exist.

- [ ] **Step 3: Implement the rehearsal harness**

Read and hash-verify `powersync-concurrency.mjs evaluate` output to determine the required client count. Generate deterministic mutation IDs for workout, set, and cardio rows. Start clients against the old generation with offline queues, rebuild PowerSync server state against restored Zor PostgreSQL, reconnect clients in configurable batches, and poll until drained or five minutes. Query authoritative tables for every mutation ID and reject missing or duplicate rows.

- [ ] **Step 4: Make CI coverage explicit and required**

Split or extend jobs so required gates run:

```text
pnpm identity:test && pnpm identity:check && pnpm branding:check && pnpm brand:audit
pnpm lint
pnpm --filter @zor/web test
pnpm --filter @zor/mobile test:unit
pnpm --filter @zor/mobile test:components
pnpm --filter @zor/shared test
pnpm --filter @zor/sync test
pnpm --filter @zor/db test
pnpm --filter @zor/api test
pnpm --filter @zor/web build
pnpm --filter @zor/web test:e2e
```

The API job creates `zor`/`zor_test` and runs `pnpm --filter @zor/db exec prisma migrate deploy`, never `db push`. Add mobile and sync lint scripts so root `pnpm lint` truly covers all six workspaces. Keep Lighthouse advisory only if already advisory; branding, tests, build, accessibility, and migration-path gates are required.

Add Maestro flows that install a fixture with `ironpulse.db`, relaunch the new build, verify the diagnostic migration state, then run critical login, offline workout, sync, upload, and GPS flows using immutable app IDs.

- [ ] **Step 5: Run the local CI-equivalent suite**

Run:

```bash
pnpm identity:test
pnpm identity:check
pnpm branding:check
pnpm brand:audit
pnpm lint
pnpm test
pnpm --filter @zor/web build
node --test scripts/zor-cutover/__tests__/*.test.mjs scripts/compose-config.test.mjs
```

Expected: PASS with no skipped required workspace. Database-backed suites run against a disposable PostGIS service created with the canonical Zor test role/database.

- [ ] **Step 6: Commit**

```bash
git add .forgejo/workflows package.json packages/db/package.json packages/sync/package.json apps/mobile/package.json scripts/zor-cutover
git commit -m "ci: enforce complete Zor cutover gates"
```

### Task 10: Final repository verification and release handoff

**Files:**
- Modify: `docs/runbooks/zor-hard-cutover.md`
- Create: `docs/runbooks/evidence/zor-release-candidate.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes every prior task.
- Produces a frozen release-candidate evidence index; it does not perform the live cutover itself.

- [ ] **Step 1: Run the complete clean-checkout verification**

From a fresh worktree at the release commit, run:

```bash
pnpm install --frozen-lockfile
pnpm identity:test
pnpm identity:check
pnpm branding:check
pnpm brand:audit
pnpm lint
pnpm test
pnpm --filter @zor/web build
node --test scripts/zor-cutover/__tests__/*.test.mjs scripts/compose-config.test.mjs scripts/smoke/check-health.test.mjs
git diff --check
```

Expected: every command exits 0. Record command, commit SHA, UTC timestamp, duration, and result in the evidence file.

- [ ] **Step 2: Verify migration rehearsals and restore evidence**

Require links/hashes for Android and iOS client migration runs, web IndexedDB tests, PostgreSQL restore manifest, MinIO source/target manifests, Redis inventory, PowerSync resync report, public-origin-on-blue smoke, multi-architecture image digest, and isolated post-backup restore. Any absent artifact leaves the release candidate blocked.

- [ ] **Step 3: Verify immutable compatibility and mutable retirement lists**

Run a manifest-driven report that prints retained application/IAP/EAS values and the exact mutable identifiers scheduled for retirement. Confirm no `com.zor.app`, old deep-link scheme, mutable legacy domain, repository, registry, service, role, database, bucket, volume, backup prefix, or lock appears in active configuration.

- [ ] **Step 4: Update release notes and freeze the candidate**

Document the required mobile update, maintenance window, pre-write rollback boundary, post-write roll-forward policy, and seven-day retirement hold. Tagging/publishing occurs only after a human signs the evidence index.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md docs/runbooks
git commit -m "docs(release): record Zor cutover verification"
```

## Execution boundary

Tasks 1–10 produce, test, and rehearse the repository changes and operator tooling. The live Forgejo/GitHub rename, registry publication, DNS/TLS/provider changes, production data copy, traffic switch, write reopening, and retirement are stateful external operations. Execute those only in the approved maintenance window by following the signed runbook; repository implementation success alone is not permission to mutate production.
