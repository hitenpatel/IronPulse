# Self-hosting IronPulse with Docker Compose

Run your own private IronPulse instance — the full web app, database, file
storage, and offline-sync service — with a single `docker compose up`. This is
the **self-hosted** model: you own the data and the infrastructure. (The
**managed** model, where the IronPulse team hosts it for you, is a separate
paid offering and needs no setup on your side.)

---

## What you get

A self-hosted instance runs every server-side feature: workout & cardio
logging, stats, history, goals, templates, nutrition, sleep, progress photos,
the social feed, coaching, messaging, and challenges — all scoped to the users
on *your* instance. Optional integrations (AI workouts, Stripe, OAuth sign-in,
Strava/Garmin, email) are off until you add their keys.

### What it does *not* include

- **The mobile app.** The published Android/iOS builds point at the managed
  cloud URL. To use the mobile app against your own server you must rebuild it
  with `EXPO_PUBLIC_API_URL=https://your-domain` (see
  [Mobile app](#mobile-app-optional)). The **web app is fully responsive** and
  works on phones today with no rebuild.
- **Cross-instance social.** Feed, coaching, and challenges only connect users
  on the same instance — a solo instance is a private island by design.

---

## Requirements

- A host with Docker Engine 24+ and the Docker Compose v2 plugin
  (`docker compose version`).
- ~2 vCPU / 4 GB RAM minimum (the first build is the heaviest step).
- A domain name + reverse proxy if you want HTTPS and remote access
  (see [HTTPS](#https--remote-access)).

---

## Quick start

All commands run from the `docker/` directory.

```bash
cd docker
cp .env.example .env

# 1. Set the one required value:
#    NEXTAUTH_SECRET — generate a random secret
openssl rand -base64 32        # paste the output into .env as NEXTAUTH_SECRET

# 2. Build and start everything
docker compose up -d --build
```

The first run will:

1. Build the Next.js app image (a few minutes).
2. Start Postgres (PostGIS), Redis, MinIO, Mongo, and PowerSync.
3. Run database migrations and seed reference data automatically
   (`entrypoint.sh` → `prisma migrate deploy` → `prisma db seed`).

Watch progress:

```bash
docker compose logs -f ironpulse
```

When `/api/health` is green the app is ready:

```bash
curl -fsS http://localhost:3000/api/health && echo OK
```

Open <http://localhost:3000> and create the first account through the normal
sign-up flow.

---

## Configuration

Everything is driven by `docker/.env` (copied from `.env.example`). Only
`NEXTAUTH_SECRET` is mandatory; every other value either has a safe default or
gates an optional feature.

| Variable | Required | Purpose |
|---|---|---|
| `NEXTAUTH_SECRET` | ✅ | Signs sessions. Generate with `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | ✅ for remote | Public URL users hit. Must match the browser/proxy address. |
| `POSTGRES_USER/PASSWORD/DB` | default | DB creds (internal network only); used by the backup job. |
| `OPENAI_API_KEY` | optional | Enables AI workout generation (billed to your key). |
| `GOOGLE_*` / `APPLE_*` | optional | OAuth sign-in. Redirect: `<NEXTAUTH_URL>/api/auth/callback/<provider>`. |
| `RESEND_API_KEY` | optional | Transactional email (password reset). |
| `STRIPE_*` | optional | Coach subscriptions. |
| `MEAL_SCAN_API_KEY` | optional | Photo-based meal scanning. |
| `STRAVA_*` / `GARMIN_*` | optional | Device integrations. |

After editing `.env`, apply changes with:

```bash
docker compose up -d
```

---

## Services

| Service | Image | Role | Host port |
|---|---|---|---|
| `ironpulse` | built locally | Next.js web app + tRPC API | 3000 |
| `postgres` | postgis/postgis:16-3.4 | Primary database | — (internal) |
| `redis` | redis:7 | Cache / rate-limit store | — (internal) |
| `minio` | minio/minio | S3-compatible file storage | 9001 (console) |
| `mongo` | mongo:7 | PowerSync bucket storage | — (internal) |
| `powersync` | journeyapps/powersync-service | Offline sync backend | 8080 |
| `backup` | postgis (cron) | Nightly `pg_dump` to a volume | — |
| `uptime-kuma` | louislam/uptime-kuma | Optional status dashboard | 3001 |

Only `ironpulse` (3000) needs to be reachable by users. Keep the rest on the
internal network or firewalled.

---

## HTTPS & remote access

The app does not terminate TLS itself. Put a reverse proxy in front of port
3000 and set `NEXTAUTH_URL` to the public HTTPS URL. Minimal Caddy example:

```caddyfile
fitness.example.com {
    reverse_proxy localhost:3000
}
```

Then in `.env`:

```env
NEXTAUTH_URL=https://fitness.example.com
```

`NEXTAUTH_URL` **must** match the address in the browser or sign-in callbacks
and passkeys will fail.

---

## Backups & restore

The `backup` service runs `pg_dump` daily into the `backups` volume. Scripts
live in this directory:

```bash
# Manual backup
docker compose exec backup /backup.sh

# Restore a dump (DESTRUCTIVE — overwrites the current DB)
docker compose exec backup /restore.sh /backups/<dump-file>.sql.gz
```

Also back up the `miniodata` volume (uploaded photos) alongside the DB dumps.

---

## Updating

```bash
git pull
cd docker
docker compose up -d --build
```

Migrations run automatically on container start via `entrypoint.sh`. Take a
backup first.

---

## Mobile app (optional)

The web app works on mobile browsers with no extra work. To run the **native**
app against your instance you must produce your own build pointing at your
server:

```bash
cd apps/mobile
EXPO_PUBLIC_API_URL=https://fitness.example.com \
  npx eas-cli build --platform android --profile preview
```

Then sideload the resulting APK. (The default `API_URL` lives in
`apps/mobile/lib/config.ts`.) iOS additionally requires an Apple Developer
account to install a custom build.

---

## Troubleshooting

- **App container restarts / "Missing required environment variable":** you
  didn't set `NEXTAUTH_SECRET` in `.env`.
- **Health check never passes:** `docker compose logs ironpulse`. Most often
  the DB wasn't ready; the entrypoint retries migrations, but check
  `docker compose logs postgres`.
- **Login redirect loop / callback errors:** `NEXTAUTH_URL` doesn't match the
  URL in the browser. Fix it and `docker compose up -d`.
- **AI workouts say "unavailable":** `OPENAI_API_KEY` is unset — expected if
  you haven't enabled it.
- **Reset everything (DESTROYS DATA):**
  `docker compose down -v` then `docker compose up -d --build`.
