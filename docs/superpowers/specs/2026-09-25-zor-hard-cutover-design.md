# Zor Hard-Cutover Design

**Date:** 2026-09-25
**Status:** Approved; cross-model corrections incorporated
**Scope:** Complete the Zor rebrand across product, repositories, deployment infrastructure, persistent storage, mobile local storage, documentation, and enforcement tooling.

## 1. Purpose

The product already presents primarily as Zor, but active configuration is split among Zor, Mettle Lift, and IronPulse identifiers. The split reaches CI, container images, domains, Compose projects, persistent storage, mobile configuration, and documentation. It has also produced an application-ID regression: the shipping bundle remains `com.ironpulse.app`, while HealthKit, Google Fit, and React Native CLI configuration incorrectly identify the app as `com.zor.app`.

This project completes a hard cutover to Zor. Mutable legacy identifiers are migrated and retired rather than retained as aliases. Existing user data is preserved through a blue-green migration and a planned maintenance window. Only identities that cannot change without breaking installed applications or paid subscriptions remain as explicit compatibility exceptions.

## 2. Confirmed Decisions

- Use a blue-green deployment and a planned maintenance window.
- Use `zor.hiten-patel.co.uk` for production.
- Use `staging.zor.hiten-patel.co.uk` for staging.
- Rename the Forgejo repository to `hiten/Zor`.
- Rename the GitHub mirror to `hitenpatel/Zor`.
- Publish container images at `git.hiten-patel.co.uk/hiten/zor`.
- Migrate PostgreSQL roles/databases, MinIO buckets, Docker volumes, backup names, and on-device PowerSync database files to Zor names.
- Do not preserve old hosted domains, deep-link schemes, registry paths, or mutable infrastructure names as runtime aliases after cutover.
- Preserve user data and unsynced mobile writes.
- Preserve only externally immutable application/store identifiers.

## 3. Canonical Identity Contract

A checked-in machine-readable identity manifest will be the source of truth for active naming. Audit and validation scripts will read this manifest instead of maintaining independent lists of expected names.

| Concern | Canonical value |
| --- | --- |
| Product display name | `Zor` |
| Store listing name | `Zor Fitness` |
| Production origin | `https://zor.hiten-patel.co.uk` |
| Staging origin | `https://staging.zor.hiten-patel.co.uk` |
| Local development origin | `https://zor.local` |
| Forgejo repository | `hiten/Zor` |
| GitHub mirror | `hitenpatel/Zor` |
| Container registry image | `git.hiten-patel.co.uk/hiten/zor` |
| Production Compose project | `zor-prod` |
| Staging Compose project | `zor-staging` |
| Application service | `zor` |
| PostgreSQL production role/database | `zor` / `zor` |
| PostgreSQL test role/database | `zor` / `zor_test` |
| MinIO bucket | `zor` |
| Backup filename prefix | `zor_` |
| PowerSync client database | `zor.db` |
| Deep-link scheme | `zor://` |
| Deployment lock | `/tmp/zor-deploy.lock` |

### 3.1 Immutable compatibility exceptions

The following remain unchanged because changing them would create a new installed application or paid product rather than rename the existing one:

- Android application ID and iOS bundle ID: `com.ironpulse.app`
- Coexisting E2E application ID: `com.ironpulse.app.e2e`
- Existing in-app-purchase product IDs under `com.ironpulse.*`
- Existing EAS project UUID

The EAS slug and project display metadata will become Zor while retaining the existing project UUID. HealthKit and Google Fit self-source filtering and React Native CLI configuration must use the immutable shipping bundle/application ID, not a Zor-shaped identifier.

No other active legacy-name exception is permitted without a new explicit design decision.

### 3.2 Migration-only legacy inputs

The following origins are recognized only as inputs to one-time client/server migration and audit cleanup. They are not active aliases or permitted target values:

- `https://ironpulse.hiten-patel.co.uk`
- `https://staging.ironpulse.hiten-patel.co.uk`
- `https://mettlelift.hiten-patel.co.uk`
- `https://staging.mettlelift.hiten-patel.co.uk`

The identity manifest keeps these values in a migration-only section that active configuration cannot consume. Tests prove that URL migration accepts only these exact origins and leaves arbitrary self-hosted origins unchanged.

## 4. Architecture

### 4.1 Blue-green deployment

The existing stack remains the authoritative blue environment until the maintenance window. A separate green environment is provisioned entirely with Zor identifiers. It receives restored copies of PostgreSQL and MinIO data and independently rebuilt Redis, Mongo, and PowerSync state.

The green stack is validated through private routing before public DNS changes. During cutover, the reverse proxy serves a maintenance response and blocks application writes. A final PostgreSQL dump/restore and MinIO delta mirror bring green current. Public DNS and provider callbacks then move to Zor. Maintenance remains active until public-origin smoke tests pass.

Writes reopen only after validation. Before writes reopen, rollback means reversing DNS and restarting blue. After writes reopen on green, the recovery policy is roll-forward; automatic failback is prohibited because it would create divergent databases.

### 4.2 Data ownership

- **PostgreSQL** is the authoritative application datastore.
- **MinIO** is authoritative for progress photos and other uploaded objects.
- **Redis** is expected to contain disposable cache, rate-limit, and Pub/Sub state. Preflight must prove that no durable queue, session, denylist, or irreplaceable state uses Redis before green starts empty.
- **Mongo/PowerSync server state** is derived from PostgreSQL and is rebuilt rather than copied.
- **PowerSync client storage** may contain unsynced writes and must be migrated before the renamed database is opened: SQLite on mobile and IndexedDB on web.

### 4.3 External systems

Forgejo, GitHub, DNS, TLS, OAuth providers, device-integration callbacks, Stripe webhooks, EAS metadata, monitoring, and email sender configuration are part of the cutover. Where repository code cannot perform the external mutation safely, the runbook provides an explicit operator step and verification command. The cutover cannot be declared complete while any external system still targets a mutable legacy identifier.

## 5. Migration Design

### 5.1 Preflight

At least 24 hours before cutover:

1. Freeze the release candidate and reduce relevant DNS TTLs to 300 seconds.
2. Inventory every old identifier in repository files and external systems.
3. Produce PostgreSQL and MinIO backups and restore both into an isolated rehearsal environment.
4. Provision new Zor DNS records, TLS routing, registry path, secrets, database roles, buckets, volumes, monitoring, and provider callback registrations. Where a provider supports multiple callbacks, register Zor alongside the old callback; prepare maintenance-window changes for providers that support only one.
5. Build and validate the green stack from the frozen release candidate.
6. Make the Zor public origins live and route them to the still-authoritative blue backend. This is the production front door for updated clients before green cutover, not a legacy alias retained after cutover.
7. Publish the mobile update containing server-origin and SQLite migrations. Store review and staged rollout may take an arbitrary amount of time, so the new origin must already be healthy before submission. Older app versions will stop syncing at final cutover and must update; no legacy-domain alias will remain.
8. Publish and verify the final multi-architecture image at the Zor registry path before renaming repositories. Then rename Forgejo and GitHub and atomically update workflow checkout URLs, mirrors, local remotes, badges, and issue links while the already-published cutover artifact remains available.

### 5.2 PostgreSQL migration

The migration uses dump/restore rather than renaming the live database:

1. Create the Zor role and database with least-required privileges.
2. Restore a custom-format dump using `--no-owner` into the Zor database.
3. Assign Zor ownership to application schemas and objects.
4. Run `prisma migrate deploy` using the exact Prisma version locked by the workspace.
5. Validate migration history, extensions, tables, row counts, foreign keys, sequences, publication/replication configuration, PowerSync triggers, and the explicit server-migration query matrix in Section 9.3.

Migration tooling is idempotent and supports dry-run/preflight modes. It never drops or mutates the source database.

### 5.3 MinIO migration

Create a Zor bucket and mirror all objects from the source. Generate deterministic source and target manifests containing every key, version ID where versioning is active, size, metadata, and a content hash. Multipart objects or backends without a trustworthy object checksum must be streamed and hashed rather than silently exempted. A zero-object result passes only when both source and target manifests are empty. During maintenance, run a final delta mirror and repeat the same manifest comparison. Application configuration switches to the Zor bucket only after exact validation.

The old bucket is read-only after cutover and retained with the blue snapshot for the rollback period.

### 5.4 Redis, Mongo, and PowerSync

Inventory Redis key types, TTLs, and writers before declaring it disposable. Start Redis empty only after confirming all state can be reconstructed or safely expired. Start a fresh Mongo replica set and PowerSync instance against the restored Zor PostgreSQL database. No legacy Mongo or Redis volumes are attached to green.

Rebuilding PowerSync changes server bucket generations and can force every client to resynchronize. The rehearsal must measure full-resync load at projected concurrency, establish capacity and rate limits, and prove that existing clients with pending offline writes reconnect, resolve the changed checkpoint safely, upload each mutation once, and reach convergence without duplicate application rows.

The measurable pass gate uses `max(25, 2 × the observed seven-day peak concurrent-client count)` clients, each with at least ten uniquely identifiable pending mutations across workout, set, and cardio data. The observed peak comes from a complete seven-day, 15-second sample of established TCP connections to the running PowerSync container, collected from the container network namespace and rejected if the sample has a gap longer than 60 seconds. All queues must drain within five minutes of their reconnect batch, with zero missing mutations, zero duplicate application rows, and zero unresolved client errors. Reopening writes is staged in monitored batches if an all-at-once reconnect would exceed rehearsed capacity.

### 5.5 Mobile origin migration

On first start of the updated app, before authentication restoration, tRPC creation, or PowerSync initialization:

- Replace persisted managed-cloud URLs matching the explicit migration set—former IronPulse production and former Mettle Lift production/staging origins—with the corresponding Zor origins.
- Preserve user-entered self-hosted URLs unchanged.
- Perform the migration idempotently and record its completion only after persistence succeeds.
- Fresh installs use the Zor production origin and continue to support the runtime self-hosted server picker.

### 5.6 Mobile SQLite migration

Foreground PowerSync is the only production path that currently opens the real mobile SQLite database. The apparent GPS database path is a no-op adapter; this rebrand must not activate GPS persistence or add `_gps_buffer` to the PowerSync-managed database. Real GPS persistence is separate feature work.

The foreground app completes one asynchronous database-readiness gate before constructing PowerSync, authentication, or networking. A JavaScript singleton promise and a native in-process mutex prevent overlapping calls in one runtime/process; an OS file lock protects cross-process attempts. Database filenames may appear only in the identity manifest, the migration adapter/native module, and exact test fixtures.

The gate uses an inter-task/process-safe migration lock and performs this sequence:

1. Stop or defer GPS writes and prove that no database handle is open.
2. If `zor.db` is already valid, use it and leave no active dependency on the old filename.
3. If only the old database exists, open it exclusively and run `PRAGMA wal_checkpoint(TRUNCATE)` so committed WAL frames are merged into the main file.
4. Close the source handle. Do not migrate the old SHM file; it is shared-memory state and must be rebuilt. After a successful checkpoint, migrate the main database through a temporary Zor filename and atomically promote it. A copy fallback must fsync the temporary file before promotion.
5. Open and validate the Zor database, including integrity checks, PowerSync metadata, and pending upload state.
6. Remove old main/WAL/SHM files only after successful validation and release the migration lock.
7. If migration fails, retain all source files, report the failure, and refuse to create or open a fresh empty Zor database over the error.

The native copy runs on an I/O worker rather than the UI thread and reports byte progress to the startup gate. Automated tests exercise duplicate same-process calls, cross-process locking, large databases, interrupted copies, and restart recovery. The source is quiescent because migration runs after the updated binary starts and before any PowerSync handle is constructed; the no-op GPS adapter does not open it.

Client storage migration is one-way and occurs during the preflight mobile rollout. Rolling server routing back to blue does not rename a migrated client database back to its legacy name.

### 5.7 Web IndexedDB migration

Before constructing the PowerSync SharedWorker, web startup acquires a Web Lock and an IndexedDB version-change barrier on the legacy `IDBBatchAtomicVFS` database. The barrier forces existing tabs/workers to close before the migration snapshots and copies the database into the Zor name while preserving object stores, indexes, keys, ArrayBuffer values, and record counts. The target is not marked active until the source snapshot validates and legacy deletion succeeds.

If another tab or SharedWorker blocks the version-change barrier, startup remains fail-closed with instructions to close other Zor tabs and no target is created. Once the blocker closes, the exclusive transaction snapshots the latest source state, copies it, validates it, deletes the source, and only then activates the destination. An unexpected blocked deletion also keeps the destination unactivated until deletion succeeds. A browser integration test uses two tabs and the real PowerSync worker; a fake IndexedDB unit test alone is insufficient evidence.

### 5.8 Repository, registry, and deployment cutover

- Build and publish both architectures at the Zor registry path, publish the multi-architecture manifest, and verify a pull before repository renames.
- Rename Forgejo and GitHub repositories and atomically update local remotes, documentation, badges, issue links, workflow URLs, and mirror configuration while the pre-published image remains available.
- Change Compose project, service, container, network, volume, router, and deployment-lock names to Zor.
- Parameterize public origins where environment-specific values are appropriate, while defaults and examples use canonical Zor values.
- Replace old backup prefixes and service paths. Old backup archives remain restorable through an explicitly supplied filename, but active discovery and new output use only Zor names.
- Remove the old deep-link scheme from active app configuration.
- Inventory every email template, stored notification payload, OAuth redirect registration, and provider callback that can emit the old deep-link scheme. Update emitters before the mobile release and record the accepted expiry/breakage window for already-issued links; the hard-cutover decision does not imply those artifacts disappear automatically.

## 6. Cutover Sequence

1. Confirm all rehearsal and preflight gates, including Redis inventory, PowerSync resync capacity, healthy Zor public origins against blue, mobile-release availability, renamed repository/mirror health, and a verified pull of the pre-published Zor image digest.
2. Freeze deploys, acquire both old and new deployment lock names, reject any concurrent deploy, then make all tooling use only `/tmp/zor-deploy.lock` after the transition completes.
3. Enable proxy-level maintenance mode and stop old application workers/schedulers.
4. Take final PostgreSQL and MinIO backups.
5. Apply the final PostgreSQL restore/delta and MinIO delta to green.
6. Run the exact database, object, health, sync, and application validation matrix.
7. Switch the Zor origin from blue to green. Apply single-callback provider changes, retire old callbacks, and verify DNS, TLS routing, webhooks, email identity, EAS metadata, and monitoring.
8. Run smoke tests through the public Zor origins while maintenance remains active.
9. Reopen writes in the rehearsed PowerSync rollout batches and start Zor schedulers.
10. Observe error, sync, job, and data-integrity signals through the rollback period.
11. After seven healthy days, archive the final blue backups and explicitly retire old domains, registry images, stacks, buckets, volumes, and secrets.

Cleanup is a separate command/phase. Migration and validation tooling cannot invoke cleanup.

## 7. Failure Handling and Rollback

- Data-copy and data-migration phases fail closed and leave their source data intact. External renames and routing changes are stateful operator actions and use explicit precondition and postcondition checks rather than claiming idempotency.
- Destructive data operations require explicit source and target arguments plus a verified-backup marker.
- Logs record identifiers, counts, checksums, versions, timestamps, and outcomes without recording secrets.
- Re-running a completed data migration or validation phase is safe. External repository, DNS, and provider mutations are detected as already-applied or conflicting before any action.
- Any mismatch in database integrity, object validation, migration versions, authentication, uploads, or sync blocks DNS cutover or reopening writes.
- Before writes reopen, server rollback restores old routing and blue services. Client origin/storage migrations delivered during preflight are one-way and remain compatible with blue through the already-live Zor origins.
- After writes reopen, incidents use roll-forward repair against green. Blue is evidence and emergency recovery material, not an automatically writable fallback.
- Old infrastructure is not deleted until the seven-day healthy period and a final explicit operator approval.

For retirement purposes, seven healthy days means all of the following hold continuously or meet the stated threshold:

- public health probes achieve at least 99.9% availability, excluding an explicitly recorded maintenance interval;
- no unresolved critical/high application error attributable to the cutover remains in Sentry;
- every scheduled job reports its expected cadence and no dead-letter queue grows without an acknowledged incident;
- PowerSync clients converge, the upload backlog drains, and no migration-related duplicate-write incident remains unresolved;
- PostgreSQL integrity checks and MinIO manifest checks remain clean;
- at least one post-cutover PostgreSQL-and-MinIO backup has been restored successfully in isolation.

Retirement evidence is not hand-authored status JSON. A checked-in collector queries the configured health-monitoring, Sentry, scheduled-job, PowerSync backlog, PostgreSQL, MinIO, and restore-evidence sources for the exact seven-day window; it stores the query, source identifier, retrieval time, raw-response SHA-256, and evaluated result. Retirement revalidates live sources where available and rejects missing credentials, gaps, stale windows, or unverifiable operator assertions.

## 8. Repository Components

### 8.1 Identity manifest and validator

The manifest contains canonical and immutable identifiers. Validation checks active files against those values. Configurations that cannot directly import the manifest are checked by tests rather than copied without enforcement.

### 8.2 Brand audit

The audit enumerates tracked files rather than walking the working directory. This prevents ignored agent artifacts from causing failures. It recognizes compound environment-example names such as `.env.prod.example`, scans an explicit set of active text/config formats, and has fixture-based tests for tracked-file enumeration, compound filenames, immutable identifiers, and forbidden legacy identifiers.

Known frozen historical paths are explicitly enumerated. There is no heuristic historical classifier. Closed backlog records may be enumerated individually to preserve decision provenance; active backlog items are updated through the repository's task tooling where available. Runbooks, examples, workflows, and deployment files are not historical merely because they live in a documentation directory.

### 8.3 Migration utilities

Server utilities provide explicit preflight, migrate, validate, and cleanup modes. Mobile migration is application startup code with platform-appropriate filesystem adapters. Each component exposes enough pure logic for deterministic unit tests.

### 8.4 Cutover runbook

The checked-in runbook contains prerequisites, exact sequencing, operator ownership, verification commands, expected output, abort criteria, rollback, monitoring, and retirement. Private documentation may supplement credentials or host-specific values but cannot be the only source of required operational behavior.

## 9. Verification

### 9.1 Brand and configuration

- `branding:check` passes.
- `brand:audit` reports zero forbidden active references.
- Exact immutable identifiers are validated from the identity manifest.
- All Compose combinations render successfully.
- Repository clone URLs, mirrors, registry pulls, DNS, and TLS use Zor identities.

### 9.2 Mobile migration

Automated tests cover:

- fresh installation;
- old database only;
- valid Zor database already present;
- both names present;
- main database with WAL/SHM companions;
- interrupted copy/move;
- invalid destination database;
- repeated startup;
- pending PowerSync uploads preserved;
- duplicate same-process startup calls and cross-process attempts serialize against the same migration lock;
- a large database copies off the UI thread and reports progress;
- WAL checkpoint succeeds before migration and stale SHM state is not copied;
- old managed-cloud URL rewritten;
- self-hosted URL preserved;
- failure leaves source data untouched.

Web migration tests also cover a source held by the real PowerSync SharedWorker in another browser tab, blocked deletion, fail-closed retry, and a fresh recopy after the worker releases the source.

At least one Android device and one iOS simulator or device run verify the actual filesystem and PowerSync behavior before hosted cutover. Neither platform may defer migration verification until after cutover.

### 9.3 Server migration

- Fresh `prisma migrate deploy` succeeds.
- A restored production-shaped database upgrades successfully.
- Database row counts, constraints, sequences, and publications validate.
- Authentication/session creation and user/profile reads succeed.
- Workout, exercise, set, cardio route, body metric, sleep, and nutrition reads succeed.
- A workout creation/finalization transaction succeeds and produces its expected outbox and derived records.
- Coaching/program, social feed, challenge, notification, and messaging reads succeed.
- Upload issuance and object retrieval succeed against the Zor bucket.
- Provider webhook ingestion and worker dispatch succeed against test fixtures.
- An existing offline client with a pending write survives the new PowerSync bucket generation and converges exactly once.
- MinIO counts, bytes, keys, and checksums match.
- PowerSync performs a clean initial sync and applies an offline client write after reconnect.
- PostgreSQL and MinIO backup restoration is rehearsed.

### 9.4 Application and CI

Required CI runs:

- lint and typecheck for all six workspaces;
- web, mobile unit, mobile component, shared, sync, database, and API test suites;
- Zor asset and brand validation;
- production web build;
- Playwright web E2E and accessibility checks;
- critical Android Maestro flows;
- fresh-install and migration-path database validation.

Release verification also covers authentication, OAuth, uploads, payments/webhooks, email identity, background jobs, health endpoints, offline writes, reconnect sync, monitoring, and backup/restore.

## 10. Acceptance Criteria

1. Active product and developer presentation uses Zor except for the enumerated immutable compatibility identifiers.
2. Production and staging operate at the selected Zor domains with valid TLS.
3. Forgejo, GitHub, registry, Compose, database, bucket, volume, backup, deployment, and client-database identifiers use Zor names.
4. Immutable bundle, E2E, IAP, and EAS project identities continue to serve the existing application and subscriptions.
5. Existing PostgreSQL, MinIO, and unsynced mobile data is preserved and validated.
6. Old mutable domains, deep links, registry paths, stacks, buckets, volumes, and secrets are retired after the rollback period.
7. All required CI, migration rehearsal, public-origin smoke, monitoring, and restore gates pass.
8. The identity manifest and required CI checks prevent legacy branding from returning.

## 11. Out of Scope

- Product UI redesign.
- New fitness features.
- Changing the shipping application ID, E2E application ID, existing IAP product IDs, or EAS project UUID.
- Supporting old mobile versions indefinitely after the hard cutover.
- Automatic failback after writes have reopened on green.
