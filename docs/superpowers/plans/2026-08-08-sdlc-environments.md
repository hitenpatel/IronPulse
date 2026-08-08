# SDLC Environments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three environments (dev local, staging on NAS, prod on Oracle VM) with auto staging deploys from `develop`, gated manual prod deploys from `main`, and migration-based schema management.

**Architecture:** CI on Forgejo (arm64 runner on the prod VM) builds multi-arch images, pushes them sha-tagged to the Forgejo registry, and deploys via SSH + `docker compose`. `prisma migrate deploy` is run only by deploy jobs (single owner); entrypoint keeps `db push` for dev. Smoke tests verify the deployed sha via `/api/health`.

**Tech Stack:** Forgejo Actions, docker buildx + QEMU, Docker Compose, Prisma 6, Next.js 15 standalone, Playwright, Expo EAS.

**Spec:** `docs/superpowers/specs/2026-08-08-sdlc-environments-design.md` — read it before starting.

## Global Constraints

- Commit messages: conventional commits, **lowercase subject** (commitlint rejects sentence-case).
- Registry image name: `git.hiten-patel.co.uk/hiten/mettlelift`. Tags: `staging-<sha>`, `prod-<sha>`. Never deploy a `latest` tag.
- CI runner label: `arm64`. NAS is amd64 — all images built `linux/amd64,linux/arm64`.
- Domains: staging `https://staging.mettlelift.hiten-patel.co.uk`, prod `https://mettlelift.hiten-patel.co.uk`. **No `zor.*` domains in this work** (cutover split out per spec).
- `.forgejo/workflows/` is the workflows dir (not `.github/`).
- Package manager: pnpm via corepack; workspace filters like `pnpm --filter @mettlelift/db`.
- Never run gradle/EAS builds in the background (project rule); EAS builds are cloud-side.
- Do not edit `backlog/` markdown directly — use the `backlog` CLI.

---

### Task 0: Backlog task + branch

**Files:** none (CLI + git only)

- [ ] **Step 1:** Run `backlog instructions task-creation`, then create one backlog task titled "implement sdlc environments (staging/prod pipeline)" referencing the spec path and Task-14. Move it to In Progress per `backlog instructions task-execution`.
- [ ] **Step 2:** Create branch from current work base: `git checkout -b feat/sdlc-environments`
- [ ] **Step 3:** No commit (nothing changed in-repo; backlog CLI makes its own commits if configured).

---

### Task 1: Squash migrations into a baseline `0_init`

The migration history is incremental-only; `migrate deploy` cannot build an empty database (documented in `docker/entrypoint.sh:17-24`). Squash to a single init migration generated from `schema.prisma`.

**Files:**
- Create: `packages/db/prisma/migrations/00000000000000_init/migration.sql`
- Delete: all 16 existing `packages/db/prisma/migrations/2026*/` directories
- Keep: `packages/db/prisma/migrations/migration_lock.toml`

**Interfaces:**
- Produces: a migrations dir where `prisma migrate deploy` succeeds on an empty PostGIS database. Tasks 9/10 run exactly `prisma migrate deploy`; the prod runbook (Task 12) runs `prisma migrate resolve --applied 00000000000000_init`.

- [ ] **Step 1: Generate init SQL from the schema**

```bash
cd packages/db
npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > /tmp/init.sql
head -5 /tmp/init.sql   # sanity: starts with CREATE TABLE / CREATE EXTENSION
```

- [ ] **Step 2: Check for PostGIS extension requirement**

```bash
grep -i "postgis\|extension" packages/db/prisma/schema.prisma /tmp/init.sql
```
If the schema uses geography/geometry types and the diff didn't emit it, prepend `CREATE EXTENSION IF NOT EXISTS postgis;` to `/tmp/init.sql`.

- [ ] **Step 3: Replace history**

```bash
cd packages/db/prisma/migrations
ls -d 2026* | xargs rm -rf
mkdir 00000000000000_init
mv /tmp/init.sql 00000000000000_init/migration.sql
cat migration_lock.toml   # must still say provider = "postgresql"
```

- [ ] **Step 4: Prove it on an empty PostGIS database (this is spec acceptance #1)**

```bash
docker run -d --name migrate-proof -e POSTGRES_USER=proof -e POSTGRES_PASSWORD=proof -e POSTGRES_DB=proof -p 55432:5432 imresamu/postgis:16-3.4-alpine
sleep 10
cd packages/db
DATABASE_URL=postgresql://proof:proof@localhost:55432/proof npx prisma migrate deploy
DATABASE_URL=postgresql://proof:proof@localhost:55432/proof npx prisma migrate status
```
Expected: `migrate deploy` applies `00000000000000_init`; `migrate status` reports "Database schema is up to date".

- [ ] **Step 5: Prove the app schema matches (no drift)**

```bash
DATABASE_URL=postgresql://proof:proof@localhost:55432/proof npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --exit-code
```
Expected: exit 0 (no difference). Then clean up: `docker rm -f migrate-proof`.

- [ ] **Step 6: Commit**

```bash
git add packages/db/prisma/migrations
git commit -m "feat(db): squash migrations into baseline init for migrate deploy"
```

---

### Task 2: Seed idempotency + env-driven passwords

**Files:**
- Modify: `packages/db/seeds/seed.ts`
- Modify: `packages/db/seeds/seed-dev.ts`
- Create: `packages/db/seeds/seed-utils.ts`
- Create: `packages/db/seeds/seed-utils.test.ts`
- Modify: `packages/db/package.json` (add vitest + test script)

**Interfaces:**
- Produces: `resolveSeedPassword(env: Record<string,string|undefined>): string` and `shouldSkipDevSeed(existingWorkoutCount: number, env: Record<string,string|undefined>): boolean` in `seed-utils.ts`. seed-dev exits early when data already present unless `SEED_DEV_FORCE=1`. Staging sets `SEED_USER_PASSWORD`.

- [ ] **Step 1: Write failing tests** in `packages/db/seeds/seed-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveSeedPassword, shouldSkipDevSeed } from "./seed-utils";

describe("resolveSeedPassword", () => {
  it("uses SEED_USER_PASSWORD when set", () => {
    expect(resolveSeedPassword({ SEED_USER_PASSWORD: "s3cret" })).toBe("s3cret");
  });
  it("falls back to password123 for dev", () => {
    expect(resolveSeedPassword({})).toBe("password123");
  });
});

describe("shouldSkipDevSeed", () => {
  it("skips when sample data exists", () => {
    expect(shouldSkipDevSeed(5, {})).toBe(true);
  });
  it("runs on empty database", () => {
    expect(shouldSkipDevSeed(0, {})).toBe(false);
  });
  it("SEED_DEV_FORCE=1 overrides the skip", () => {
    expect(shouldSkipDevSeed(5, { SEED_DEV_FORCE: "1" })).toBe(false);
  });
});
```

- [ ] **Step 2:** Add vitest: in `packages/db/package.json` devDependencies add `"vitest": "^3.0"`, scripts add `"test": "vitest run"`. Run `pnpm install`, then `pnpm --filter @mettlelift/db test` — expected FAIL (module not found).

- [ ] **Step 3: Implement** `packages/db/seeds/seed-utils.ts`:

```ts
export function resolveSeedPassword(env: Record<string, string | undefined>): string {
  return env.SEED_USER_PASSWORD ?? "password123";
}

export function shouldSkipDevSeed(
  existingWorkoutCount: number,
  env: Record<string, string | undefined>,
): boolean {
  if (env.SEED_DEV_FORCE === "1") return false;
  return existingWorkoutCount > 0;
}
```

- [ ] **Step 4:** Run `pnpm --filter @mettlelift/db test` — expected PASS.

- [ ] **Step 5: Serialize seed.ts under concurrent starts.** Wrap the seeding loop in an interactive transaction holding a transaction-scoped advisory lock (pooled connections make session-level `pg_advisory_lock`/`unlock` unsafe — lock and unlock can land on different connections):

```ts
await db.$transaction(
  async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(727272)`;
    for (const ex of exercises) {
      const existing = await tx.exercise.findFirst({
        where: { name: ex.name, isCustom: false },
      });
      if (existing) {
        await tx.exercise.update({ where: { id: existing.id }, data: { /* unchanged field list */ } });
        updated++;
      } else {
        await tx.exercise.create({ data: ex });
        created++;
      }
    }
  },
  { timeout: 300_000 },
);
```
Keep the existing field list verbatim. The lock is released automatically at commit.

- [ ] **Step 6: Guard seed-dev.ts.** At the top of `seedDev()`:

```ts
import { resolveSeedPassword, shouldSkipDevSeed } from "./seed-utils";

const existingWorkouts = await db.workout.count({
  where: { user: { email: "test@example.com" } },
});
if (shouldSkipDevSeed(existingWorkouts, process.env)) {
  console.log("Dev seed data already present — skipping (set SEED_DEV_FORCE=1 to re-run).");
  return;
}
const password = await bcrypt.hash(resolveSeedPassword(process.env), 12);
```
Replace the current `bcrypt.hash("password123", 12)` line.

- [ ] **Step 7: Verify against a real database** (project rule: no mocked DB):

```bash
docker run -d --name seed-proof -e POSTGRES_USER=proof -e POSTGRES_PASSWORD=proof -e POSTGRES_DB=proof -p 55432:5432 imresamu/postgis:16-3.4-alpine
sleep 10
export DATABASE_URL=postgresql://proof:proof@localhost:55432/proof
pnpm --filter @mettlelift/db db:push
pnpm --filter @mettlelift/db db:seed && pnpm --filter @mettlelift/db db:seed & pnpm --filter @mettlelift/db db:seed; wait   # concurrent run — no duplicate exercises
pnpm --filter @mettlelift/db db:seed:dev
pnpm --filter @mettlelift/db db:seed:dev   # second run must print the skip message
docker exec seed-proof psql -U proof -d proof -c "select name, count(*) from exercises where is_custom = false group by name having count(*) > 1;"   # expect zero rows
docker rm -f seed-proof
```

- [ ] **Step 8: Commit**

```bash
git add packages/db
git commit -m "feat(db): idempotent seeds with advisory lock, run-once dev seed, env password"
```

---

### Task 3: Entrypoint schema-management switch

**Files:**
- Modify: `docker/entrypoint.sh`

**Interfaces:**
- Produces: env var `SCHEMA_MANAGEMENT` — unset/`push` = current behaviour (db push + seed); `external` = skip both (deploy job owns schema + seed). PowerSync publication block always runs (idempotent, not schema).

- [ ] **Step 1:** Replace the schema + seed section (lines 17–39) with:

```sh
if [ "${SCHEMA_MANAGEMENT:-push}" = "external" ]; then
  echo "SCHEMA_MANAGEMENT=external — schema and seeds are applied by the deploy job."
else
  echo "Syncing database schema..."
  # schema.prisma is the source of truth in dev. Staging/prod use
  # `prisma migrate deploy`, run once per release by the deploy job
  # (SCHEMA_MANAGEMENT=external) so app restarts never touch the schema.
  prisma db push --skip-generate
  echo "Seeding reference data..."
  prisma db seed
fi
```
Keep the pg_isready wait and the publication block unchanged (publication stays in the entrypoint for both modes).

- [ ] **Step 2: Verify dev path unchanged:** `docker compose -f docker/docker-compose.yml config >/dev/null && sh -n docker/entrypoint.sh` (syntax check). Full behaviour is exercised in Task 6 Step 4.

- [ ] **Step 3: Commit**

```bash
git add docker/entrypoint.sh
git commit -m "feat(docker): schema_management switch so deploy jobs own migrations"
```

---

### Task 4: Build sha in /api/health + smoke checker

**Files:**
- Modify: `apps/web/src/app/api/health/route.ts`
- Modify: `docker/Dockerfile`
- Create: `scripts/smoke/check-health.mjs`
- Create: `scripts/smoke/check-health.test.mjs`
- Modify: root `package.json` (add `"test:smoke": "vitest run scripts/smoke"` if a root vitest exists; otherwise run via `npx vitest run scripts/smoke`)

**Interfaces:**
- Produces: health JSON gains `sha: string` (from `process.env.BUILD_SHA`, `"dev"` fallback). `check-health.mjs` exports `assertHealth(body, expectedSha)` (throws on mismatch/critical failure) and, when run as a script, `node scripts/smoke/check-health.mjs <url> <expectedSha>` exits 0/1. Deploy jobs (Tasks 9/10) call the script.

- [ ] **Step 1: Failing tests** in `scripts/smoke/check-health.test.mjs`:

```js
import { describe, expect, it } from "vitest";
import { assertHealth } from "./check-health.mjs";

const ok = {
  status: "ok",
  sha: "abc1234",
  services: { db: { status: "ok" }, redis: { status: "ok" }, s3: { status: "ok" } },
};

describe("assertHealth", () => {
  it("passes on matching sha with healthy criticals", () => {
    expect(() => assertHealth(ok, "abc1234")).not.toThrow();
  });
  it("fails on sha mismatch (wrong revision deployed)", () => {
    expect(() => assertHealth(ok, "def5678")).toThrow(/sha/i);
  });
  it("fails when db or redis is down", () => {
    const bad = { ...ok, services: { ...ok.services, db: { status: "error" } } };
    expect(() => assertHealth(bad, "abc1234")).toThrow(/db/i);
  });
  it("tolerates degraded s3 (matches health route policy)", () => {
    const degraded = { ...ok, status: "degraded", services: { ...ok.services, s3: { status: "error" } } };
    expect(() => assertHealth(degraded, "abc1234")).not.toThrow();
  });
});
```

- [ ] **Step 2:** Run `npx vitest run scripts/smoke` — expected FAIL.

- [ ] **Step 3: Implement** `scripts/smoke/check-health.mjs`:

```js
export function assertHealth(body, expectedSha) {
  if (body.services?.db?.status !== "ok") throw new Error(`db unhealthy: ${JSON.stringify(body.services?.db)}`);
  if (body.services?.redis?.status !== "ok") throw new Error(`redis unhealthy: ${JSON.stringify(body.services?.redis)}`);
  if (expectedSha && body.sha !== expectedSha) {
    throw new Error(`sha mismatch: deployed ${body.sha}, expected ${expectedSha}`);
  }
}

const [, , url, expectedSha] = process.argv;
if (url) {
  const resp = await fetch(`${url.replace(/\/$/, "")}/api/health`, { signal: AbortSignal.timeout(15_000) });
  const body = await resp.json();
  if (resp.status !== 200) {
    console.error(`health returned HTTP ${resp.status}: ${JSON.stringify(body)}`);
    process.exit(1);
  }
  try {
    assertHealth(body, expectedSha);
    console.log(`health ok — sha ${body.sha}`);
  } catch (err) {
    console.error(String(err));
    process.exit(1);
  }
}
```

- [ ] **Step 4:** Run `npx vitest run scripts/smoke` — expected PASS.

- [ ] **Step 5: Health route change** in `apps/web/src/app/api/health/route.ts` — in the `body` object replace the `version` line's neighbourhood:

```ts
    version: process.env.npm_package_version ?? "unknown",
    sha: process.env.BUILD_SHA ?? "dev",
```

- [ ] **Step 6: Dockerfile** — in the `runner` stage add before `EXPOSE 3000`:

```dockerfile
ARG BUILD_SHA=dev
ENV BUILD_SHA=$BUILD_SHA
```

- [ ] **Step 7: Verify locally:** `pnpm --filter @mettlelift/web dev` briefly, `curl -s localhost:3000/api/health | grep '"sha":"dev"'`, stop dev server. (If dev server startup is impractical, `pnpm --filter @mettlelift/web build` type-checks the route.)

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/app/api/health/route.ts docker/Dockerfile scripts/smoke
git commit -m "feat(web): expose build sha in health endpoint with smoke checker"
```

---

### Task 5: Harden base compose — required credentials, digest pins

**Files:**
- Modify: `docker/docker-compose.yml`
- Create: `docker/.env.example`

**Interfaces:**
- Produces: base compose reads `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` from env with `:?` (fail-fast). `DATABASE_URL`/`PS_DATA_SOURCE_URI`/minio-init/S3 creds derive from the same vars. All images digest-pinned. Tasks 6/9/10 rely on these var names.

- [ ] **Step 1: Fetch current digests** for every image in the file:

```bash
for img in imresamu/postgis:16-3.4-alpine redis:7-alpine minio/minio:latest minio/mc:latest mongo:7-jammy journeyapps/powersync-service:latest louislam/uptime-kuma:1; do
  docker buildx imagetools inspect $img | head -3
done
```
Record each `Digest: sha256:…`.

- [ ] **Step 2: Edit compose.** Pattern (apply to every service):

```yaml
  postgres:
    image: imresamu/postgis:16-3.4-alpine@sha256:<digest-from-step-1>
    environment:
      POSTGRES_USER: ${POSTGRES_USER:?set in .env}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set in .env}
      POSTGRES_DB: ${POSTGRES_DB:?set in .env}
```
And in the `mettlelift` service:

```yaml
    environment:
      DATABASE_URL: "postgresql://${POSTGRES_USER:?}:${POSTGRES_PASSWORD:?}@postgres:5432/${POSTGRES_DB:?}"
      S3_ACCESS_KEY: ${MINIO_ROOT_USER:?set in .env}
      S3_SECRET_KEY: ${MINIO_ROOT_PASSWORD:?set in .env}
```
Same substitution in `minio`, `minio-init` (the `mc alias set` line), `powersync` (`PS_DATA_SOURCE_URI`), and the `backup` service (already uses the vars).

- [ ] **Step 3:** Create `docker/.env.example` documenting every required var with dev-safe example values (`POSTGRES_USER=mettlelift`, `POSTGRES_PASSWORD=change-me`, `POSTGRES_DB=mettlelift`, `MINIO_ROOT_USER=minioadmin`, `MINIO_ROOT_PASSWORD=change-me`, `NEXTAUTH_URL=`, `NEXTAUTH_SECRET=`, `SEED_USER_PASSWORD=` optional). Confirm `.gitignore` already excludes `docker/.env` (it does, line 5).

- [ ] **Step 4: Verify fail-fast and green paths:**

```bash
cd docker
docker compose config >/dev/null 2>&1 && echo "BUG: should have failed without env" || echo "fails fast as intended"
cp .env.example .env
docker compose config >/dev/null && echo "resolves with env file"
git status --porcelain docker/.env   # must be empty (ignored)
```

- [ ] **Step 5: Commit**

```bash
git add docker/docker-compose.yml docker/.env.example
git commit -m "feat(docker): require credentials via env and pin images by digest"
```

---

### Task 6: Staging/prod compose overrides + env examples

**Files:**
- Create: `docker/compose.staging.yml`
- Create: `docker/compose.prod.yml`
- Create: `docker/.env.staging.example`
- Create: `docker/.env.prod.example`

**Interfaces:**
- Consumes: env var names from Task 5, `SCHEMA_MANAGEMENT` from Task 3.
- Produces: on each host, `docker compose -f docker-compose.yml -f compose.<env>.yml --env-file .env` is the canonical invocation; image tag comes from `IMAGE_TAG` in the env file. Deploy jobs (Tasks 9/10) write `IMAGE_TAG` and run this exact invocation.

- [ ] **Step 1:** `docker/compose.staging.yml`:

```yaml
services:
  mettlelift:
    image: git.hiten-patel.co.uk/hiten/mettlelift:${IMAGE_TAG:?set by deploy job}
    build: !reset null
    environment:
      SCHEMA_MANAGEMENT: "external"
      NEXTAUTH_URL: "https://staging.mettlelift.hiten-patel.co.uk"
```

- [ ] **Step 2:** `docker/compose.prod.yml` — same shape, prod URL, plus backup always on:

```yaml
services:
  mettlelift:
    image: git.hiten-patel.co.uk/hiten/mettlelift:${IMAGE_TAG:?set by deploy job}
    build: !reset null
    environment:
      SCHEMA_MANAGEMENT: "external"
      NEXTAUTH_URL: "https://mettlelift.hiten-patel.co.uk"
  backup:
    profiles: !reset []
```
(`!reset` requires Compose v2.24+; verify with `docker compose version` on both hosts — runbook Task 12 covers hosts. If the NAS compose is older, instead override with `profiles: ["default"]`-style workaround documented inline.)

- [ ] **Step 3:** `.env.staging.example` / `.env.prod.example`: all Task 5 vars with placeholders, plus `IMAGE_TAG=` (comment: written by deploy job), staging file additionally `SEED_USER_PASSWORD=`; note that real files live only on the hosts.

- [ ] **Step 4: Local end-to-end proof of the staging shape** (uses local image, arm64 host is fine):

```bash
cd docker
docker build -t git.hiten-patel.co.uk/hiten/mettlelift:staging-localtest --build-arg BUILD_SHA=localtest -f Dockerfile ..
cp .env.staging.example .env.localtest && sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=staging-localtest/; s/change-me/localtest-pass/g; s/^NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=localtest-secret/' .env.localtest
docker compose -f docker-compose.yml -f compose.staging.yml --env-file .env.localtest up -d postgres redis minio
# migrate as the deploy job will (entrypoint bypassed):
docker compose -f docker-compose.yml -f compose.staging.yml --env-file .env.localtest run --rm --entrypoint sh mettlelift -c "cd /app/packages/db && prisma migrate deploy && prisma db seed"
docker compose -f docker-compose.yml -f compose.staging.yml --env-file .env.localtest up -d mettlelift
sleep 20 && node ../scripts/smoke/check-health.mjs http://localhost:3000 localtest
docker compose -f docker-compose.yml -f compose.staging.yml --env-file .env.localtest down -v && rm .env.localtest
```
Expected: migrate deploy applies init on the fresh volume, app starts WITHOUT running db push (entrypoint logs "SCHEMA_MANAGEMENT=external"), smoke passes with sha `localtest`.

- [ ] **Step 5: Commit**

```bash
git add docker/compose.staging.yml docker/compose.prod.yml docker/.env.staging.example docker/.env.prod.example
git commit -m "feat(docker): staging and prod compose overrides with external schema mode"
```

---

### Task 7: Tighten ci-gate

**Files:**
- Modify: `.forgejo/workflows/ci.yml`

**Interfaces:**
- Produces: `ci-gate` requires `build`, `test-api`, `e2e-web`. Task 8's image job runs only after these pass.

- [ ] **Step 1:** In `e2e-web` remove the `continue-on-error: true` line (it becomes blocking). Leave `lighthouse` advisory.
- [ ] **Step 2:** Replace `ci-gate`:

```yaml
  ci-gate:
    name: CI Gate
    runs-on: arm64
    if: always()
    needs: [build, test-api, e2e-web]
    steps:
      - name: Check all required jobs
        run: |
          echo "build: ${{ needs.build.result }}"
          echo "test-api: ${{ needs.test-api.result }}"
          echo "e2e-web: ${{ needs.e2e-web.result }}"
          for r in "${{ needs.build.result }}" "${{ needs.test-api.result }}" "${{ needs.e2e-web.result }}"; do
            if [[ "$r" != "success" ]]; then echo "required job failed — blocking"; exit 1; fi
          done
```

- [ ] **Step 3:** Validate YAML: `python3 -c "import yaml,sys; yaml.safe_load(open('.forgejo/workflows/ci.yml'))"`.
- [ ] **Step 4: Commit**

```bash
git add .forgejo/workflows/ci.yml
git commit -m "ci: gate on api tests and web e2e, not just build"
```

---

### Task 8: CI job — build + push multi-arch image

**Files:**
- Modify: `.forgejo/workflows/ci.yml` (new `build-image` job)

**Interfaces:**
- Consumes: `ci-gate` (Task 7), `BUILD_SHA` build-arg (Task 4).
- Produces: on push to `develop`/`main` (not PRs), image `git.hiten-patel.co.uk/hiten/mettlelift:staging-<sha>` or `:prod-<sha>` in the Forgejo registry. Secrets required: `REGISTRY_USER`, `REGISTRY_TOKEN` (claude-agent token with package write — provisioning in Task 12 runbook). Task 9 consumes the staging tag.

- [ ] **Step 1:** Append to `ci.yml`:

```yaml
  build-image:
    name: Build & Push Image
    runs-on: arm64
    if: github.event_name == 'push' && (github.ref == 'refs/heads/develop' || github.ref == 'refs/heads/main')
    needs: [ci-gate]
    steps:
      - uses: actions/checkout@v4
      - name: Install QEMU binfmt (amd64 emulation)
        run: docker run --privileged --rm tonistiigi/binfmt --install amd64
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: git.hiten-patel.co.uk
          username: ${{ secrets.REGISTRY_USER }}
          password: ${{ secrets.REGISTRY_TOKEN }}
      - name: Compute tag prefix
        id: meta
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then echo "prefix=prod" >> "$GITHUB_OUTPUT"; else echo "prefix=staging" >> "$GITHUB_OUTPUT"; fi
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/Dockerfile
          platforms: linux/amd64,linux/arm64
          push: true
          build-args: |
            BUILD_SHA=${{ github.sha }}
            SKIP_TYPECHECK_ON_BUILD=1
          tags: git.hiten-patel.co.uk/hiten/mettlelift:${{ steps.meta.outputs.prefix }}-${{ github.sha }}
          cache-from: type=registry,ref=git.hiten-patel.co.uk/hiten/mettlelift:buildcache
          cache-to: type=registry,ref=git.hiten-patel.co.uk/hiten/mettlelift:buildcache,mode=max
```

- [ ] **Step 2:** YAML validate as in Task 7 Step 3.
- [ ] **Step 3: Commit**

```bash
git add .forgejo/workflows/ci.yml
git commit -m "ci: build and push multi-arch sha-tagged images to forgejo registry"
```

- [ ] **Step 4 (verification, after Task 12 provisions secrets):** push branch to a test ref of `develop` or trust first real merge; confirm `docker manifest inspect git.hiten-patel.co.uk/hiten/mettlelift:staging-<sha>` shows both architectures. Record actual QEMU build duration in the backlog task notes (spec estimates 10–20 min).

---

### Task 9: CI job — auto-deploy staging

**Files:**
- Modify: `.forgejo/workflows/ci.yml` (new `deploy-staging` job)

**Interfaces:**
- Consumes: image tag from Task 8; compose invocation from Task 6; `check-health.mjs` from Task 4. Secrets: `STAGING_SSH_KEY` (private key), `STAGING_SSH_HOST` (e.g. `hiten@192.168.1.24 -p 222` form split into host/user/port secrets as provisioned in Task 12), staging dir convention `/volume1/docker/mettlelift` (confirm actual path in Task 12 runbook and update here if different).
- Produces: every `develop` push ends with staging serving that sha (spec acceptance #3, #4).

- [ ] **Step 1:** Append:

```yaml
  deploy-staging:
    name: Deploy Staging
    runs-on: arm64
    if: github.event_name == 'push' && github.ref == 'refs/heads/develop'
    needs: [build-image]
    concurrency:
      group: deploy-staging
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.STAGING_SSH_KEY }}" > ~/.ssh/staging && chmod 600 ~/.ssh/staging
          ssh-keyscan -p ${{ secrets.STAGING_SSH_PORT }} ${{ secrets.STAGING_SSH_HOST }} >> ~/.ssh/known_hosts 2>/dev/null
      - name: Deploy
        run: |
          TAG=staging-${{ github.sha }}
          SSH="ssh -i ~/.ssh/staging -p ${{ secrets.STAGING_SSH_PORT }} ${{ secrets.STAGING_SSH_USER }}@${{ secrets.STAGING_SSH_HOST }}"
          DIR=${{ secrets.STAGING_COMPOSE_DIR }}
          $SSH "cd $DIR && git pull --ff-only && sed -i \"s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/\" .env"
          $SSH "cd $DIR && docker compose -f docker-compose.yml -f compose.staging.yml --env-file .env pull mettlelift"
          $SSH "cd $DIR && docker compose -f docker-compose.yml -f compose.staging.yml --env-file .env run --rm --entrypoint sh mettlelift -c 'cd /app/packages/db && prisma migrate deploy && prisma db seed && tsx seeds/seed-dev.ts'"
          $SSH "cd $DIR && docker compose -f docker-compose.yml -f compose.staging.yml --env-file .env up -d"
      - name: Smoke test
        run: |
          sleep 20
          node scripts/smoke/check-health.mjs https://staging.mettlelift.hiten-patel.co.uk ${{ github.sha }}
      - name: Login + write-path smoke (Playwright)
        run: |
          # pnpm setup mirrors other jobs
          corepack enable
          pnpm install --frozen-lockfile
          pnpm --filter @mettlelift/web exec playwright install --with-deps chromium
          BASE_URL=https://staging.mettlelift.hiten-patel.co.uk pnpm --filter @mettlelift/web exec playwright test e2e/auth-login.spec.ts e2e/goals.spec.ts
```
Note: `github.sha` is the full sha; the tag and the health `sha` assertion both use the full sha (BUILD_SHA build-arg is also full) — consistent by construction. Staging test-account passwords come from `SEED_USER_PASSWORD` on the host env file; the Playwright specs read `password123` today — pass `TEST_USER_PASSWORD` env through to the specs' signIn helper if staging uses a different password (check `apps/web/e2e/helpers` during implementation; if the helper hardcodes the password, thread the env var through it in this task).

- [ ] **Step 2:** YAML validate. Also note: if the Forgejo runner version rejects `concurrency`, replace with a flock on a runner-local lockfile: `flock /tmp/deploy-staging.lock -c '<deploy commands>'` — the runner is a single host so a local lock is equivalent.
- [ ] **Step 3: Commit**

```bash
git add .forgejo/workflows/ci.yml
git commit -m "ci: auto-deploy develop to staging with migrate, seed and smoke"
```

- [ ] **Step 4 (verification, needs Task 12 host setup):** merge to `develop`; watch the run; then `node scripts/smoke/check-health.mjs https://staging.mettlelift.hiten-patel.co.uk <merged-sha>` locally. Push two commits in quick succession and confirm serial deploys (acceptance #4).

---

### Task 10: Prod deploy workflow (manual, gated)

**Files:**
- Create: `.forgejo/workflows/deploy-prod.yml`

**Interfaces:**
- Consumes: `prod-<sha>` images (Task 8), compose.prod.yml (Task 6), check-health.mjs (Task 4). Secrets: `PROD_SSH_KEY`, `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_PORT`, `PROD_COMPOSE_DIR`.
- Produces: operator-triggered deploy of an explicit sha with pre-deploy verified dump (spec acceptance #5); failure at any step leaves the previous release running.

- [ ] **Step 1:** Create the workflow:

```yaml
name: Deploy Production

on:
  workflow_dispatch:
    inputs:
      sha:
        description: "Full commit sha to deploy (must have a prod-<sha> image)"
        required: true

jobs:
  deploy-prod:
    runs-on: arm64
    concurrency:
      group: deploy-prod
      cancel-in-progress: false
    steps:
      - uses: actions/checkout@v4
      - name: Set up SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.PROD_SSH_KEY }}" > ~/.ssh/prod && chmod 600 ~/.ssh/prod
          ssh-keyscan -p ${{ secrets.PROD_SSH_PORT }} ${{ secrets.PROD_SSH_HOST }} >> ~/.ssh/known_hosts 2>/dev/null
      - name: Pre-deploy backup (verified)
        run: |
          SSH="ssh -i ~/.ssh/prod -p ${{ secrets.PROD_SSH_PORT }} ${{ secrets.PROD_SSH_USER }}@${{ secrets.PROD_SSH_HOST }}"
          DIR=${{ secrets.PROD_COMPOSE_DIR }}
          STAMP=$(date +%Y%m%d-%H%M%S)
          $SSH "cd $DIR && docker compose -f docker-compose.yml -f compose.prod.yml --env-file .env exec -T postgres sh -c 'pg_dump -U \$POSTGRES_USER \$POSTGRES_DB' > predeploy-$STAMP.sql"
          # verify: non-trivial size and a closing dump marker
          $SSH "cd $DIR && test \$(stat -c%s predeploy-$STAMP.sql) -gt 100000 && tail -1 predeploy-$STAMP.sql | grep -q 'PostgreSQL database dump complete'"
          echo "STAMP=$STAMP" >> "$GITHUB_ENV"
      - name: Deploy
        run: |
          TAG=prod-${{ inputs.sha }}
          SSH="ssh -i ~/.ssh/prod -p ${{ secrets.PROD_SSH_PORT }} ${{ secrets.PROD_SSH_USER }}@${{ secrets.PROD_SSH_HOST }}"
          DIR=${{ secrets.PROD_COMPOSE_DIR }}
          $SSH "cd $DIR && git pull --ff-only && sed -i \"s/^IMAGE_TAG=.*/IMAGE_TAG=$TAG/\" .env"
          $SSH "cd $DIR && docker compose -f docker-compose.yml -f compose.prod.yml --env-file .env pull mettlelift"
          $SSH "cd $DIR && docker compose -f docker-compose.yml -f compose.prod.yml --env-file .env run --rm --entrypoint sh mettlelift -c 'cd /app/packages/db && prisma migrate deploy && prisma db seed'"
          $SSH "cd $DIR && docker compose -f docker-compose.yml -f compose.prod.yml --env-file .env up -d"
      - name: Smoke test
        run: |
          sleep 20
          node scripts/smoke/check-health.mjs https://mettlelift.hiten-patel.co.uk ${{ inputs.sha }}
      - name: Rollback hint on failure
        if: failure()
        run: |
          echo "Deploy failed. Previous release is still running unless 'up -d' succeeded with a broken image."
          echo "App rollback: set IMAGE_TAG back to the previous prod-<sha> in $PROD_COMPOSE_DIR/.env and 'docker compose ... up -d'."
          echo "DB restore (loses writes since dump): psql < predeploy-${{ env.STAMP }}.sql"
```
No `seed-dev` in prod — reference seed only.

- [ ] **Step 2:** YAML validate. **Step 3: Commit**

```bash
git add .forgejo/workflows/deploy-prod.yml
git commit -m "ci: manual gated prod deploy with verified pre-deploy dump"
```

---

### Task 11: EAS profiles aligned to environments

**Files:**
- Modify: `apps/mobile/eas.json`

**Interfaces:**
- Produces: `preview` profile builds against staging on channel `staging`; `production` against prod on channel `production`. `e2e` untouched.

- [ ] **Step 1:** Edit `eas.json` build section:

```json
    "preview": {
      "ios": { "simulator": true },
      "distribution": "internal",
      "channel": "staging",
      "android": { "buildType": "apk" },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging.mettlelift.hiten-patel.co.uk"
      }
    },
```
and

```json
    "production": {
      "autoIncrement": true,
      "channel": "production",
      "android": { "buildType": "app-bundle" },
      "ios": { "resourceClass": "m-medium" },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://mettlelift.hiten-patel.co.uk"
      }
    }
```
Do not touch the `e2e` profile (its comment explains the coexist-package trap).

- [ ] **Step 2: Verify artifact URL correctness (spec acceptance #10)** — cloud builds only (never local on this ARM VM):

```bash
cd apps/mobile
npx eas build --profile preview --platform android --non-interactive --no-wait
```
When the build finishes, download the APK, then: `unzip -p app.apk | grep -a -c "staging.mettlelift"` (count > 0 proves the URL is baked in) or install via ADB-over-Tailscale to the Pixel and check the login screen hits staging (network log). Record the check in the backlog task. (If EAS quota is a concern, defer the actual build to the release checkpoint and mark this step pending — do not silently skip.)

- [ ] **Step 3: Commit**

```bash
git add apps/mobile/eas.json
git commit -m "feat(mobile): align eas preview/production profiles to staging/prod"
```

---

### Task 12: Host provisioning runbook (manual steps → BookStack)

**Files:**
- Create: BookStack page "SDLC environments — host provisioning" in book 19 (Iron Pulse) via API
- Modify: `docker/README.md` (short pointer section "Staging/production deploys" linking the workflows + BookStack)

This task is docs + manual ops; no code. The runbook must contain, as executable steps:

- [ ] **Step 1: Write the runbook** covering:
  1. **Forgejo secrets** to create in repo settings: `REGISTRY_USER`/`REGISTRY_TOKEN` (claude-agent, package:write), `STAGING_SSH_KEY`, `STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_PORT`, `STAGING_COMPOSE_DIR`; `PROD_SSH_KEY`, `PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_PORT`, `PROD_COMPOSE_DIR`. Include the ssh-keygen commands (`ssh-keygen -t ed25519 -f staging-deploy -C forgejo-deploy`) and where to add the public keys (NAS + VM `authorized_keys`).
  2. **NAS staging stack**: create compose dir, clone repo (or sparse checkout of `docker/`), write `.env` from `.env.staging.example` with real secrets + `SEED_USER_PASSWORD`, `docker compose version` check (≥2.24 for `!reset`), reverse-proxy vhost for `staging.mettlelift.hiten-patel.co.uk` → staging app port, DNS record. Remember Synology gotchas from shared memory: published ports see clients as 172.18.0.1 — bind the staging app port to the LAN interface IP if access control is wanted.
  3. **Prod VM stack**: mirror of current prod moved onto the compose.prod.yml invocation; `.env` from `.env.prod.example`; confirm Caddy/proxy for `mettlelift.hiten-patel.co.uk` points at the compose port.
  4. **Prod DB baseline (one-time, highest-risk step)** — exact order:
     ```bash
     # 1. verified backup first
     docker compose ... exec -T postgres sh -c 'pg_dump -U $POSTGRES_USER $POSTGRES_DB' > baseline-backup.sql
     test $(stat -c%s baseline-backup.sql) -gt 100000
     # 2. rehearse on staging: restore this dump into the staging DB, then
     docker compose ... run --rm --entrypoint sh mettlelift -c "cd /app/packages/db && prisma migrate resolve --applied 00000000000000_init && prisma migrate status"
     # expect: "Database schema is up to date"
     # 3. repeat step 2's resolve+status on prod only after staging rehearsal passes
     ```
  5. **Uptime Kuma monitors**: add HTTP(s) keyword monitors for both `/api/health` URLs (keyword `"status"`, expect 200), via `docker/setup-monitors.sh` or UI.
  6. **Registry cleanup note**: sha tags accumulate; prune old packages quarterly (Forgejo UI) — keep last 10 per prefix.
- [ ] **Step 2:** Post to BookStack (book 19) via the documented API; update `docker/README.md` pointer section.
- [ ] **Step 3: Execute the runbook** for staging + prod hosts (operator + agent over ssh MCP where possible). This is where Tasks 8–10's deferred verification steps run.
- [ ] **Step 4: Commit** (`docker/README.md` only):

```bash
git add docker/README.md
git commit -m "docs(docker): point to staging/prod deploy workflows and runbook"
```

---

### Task 13: Wire existing QA sweep + finalize

**Files:**
- Modify: `test-paths.md` (only if staging URL/creds handling changed — it already targets `staging.mettlelift.hiten-patel.co.uk`)

- [ ] **Step 1:** Re-read `test-paths.md`; update the seeded-credentials note to reference `SEED_USER_PASSWORD` (staging accounts no longer guaranteed `password123`). Keep Tier lists untouched.
- [ ] **Step 2:** Run the Tier-1 subset once against restored staging (acceptance #11): `BASE_URL=https://staging.mettlelift.hiten-patel.co.uk pnpm --filter @mettlelift/web exec playwright test e2e/auth-login.spec.ts e2e/navigation.spec.ts e2e/workouts.spec.ts`.
- [ ] **Step 3:** Rollback drill (acceptance #6): redeploy the previous staging sha by re-running the deploy with the prior tag; confirm smoke passes.
- [ ] **Step 4:** Backlog finalization per `backlog instructions task-finalization`: check acceptance criteria against the spec's 11 items, close the implementation task, close Task-14 (staging restored) with a note, annotate Task-3 (weekly sweep unblocked).
- [ ] **Step 5:** Commit docs, merge branch per normal PR flow (`develop` first — the merge itself is the staging pipeline's first live run).

---

## Failure/rollback quick reference (mirrors spec)

- Pull fails → nothing changed.
- `migrate deploy` fails → app not restarted; fix forward or restore dump (staging: fix forward).
- `up -d` crash-loop → set previous `IMAGE_TAG`, `up -d`.
- Smoke fails on prod → same rollback; investigate before retry.
- Expand/contract rule: destructive migrations only after the release consuming the expansion is proven.
