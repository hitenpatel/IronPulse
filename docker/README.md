# Zor — your fitness data, on your server

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](../LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](#5-minute-install)
[![Self-hosted](https://img.shields.io/badge/Self--hosted-friendly-success)](#why-self-host)

A full-featured fitness tracker — strength training, GPS cardio, sleep,
nutrition, body metrics, coaching, social — that you can run on a VPS, a
Raspberry Pi, or your home server. No tracking. No data sold. Your bench
press history stays on a disk you own.

> **TL;DR** — `cd docker && cp .env.example .env && docker compose up -d --build`. That's it.

---

## Why self-host?

- **Your data, your hardware.** Workouts, weight, sleep, photos, GPS routes — none of it leaves your network unless you tell it to.
- **One-shot deploy.** A single `docker compose up` brings up the web app, database, file storage, and offline sync. ~2 vCPU / 4 GB RAM is enough.
- **Optional everything.** OAuth, AI workouts, Stripe, email, device integrations are all opt-in by API key. Run zero of them if you want.
- **Open source under AGPL-3.0.** Read the code, fork it, audit it. Network forks must release their changes (see [LICENSE](../LICENSE)).
- **Cloud option for when you don't want to.** A managed hosted version is available if you'd rather pay than ops. Same app, same data model, easy migration in either direction.

---

## 5-minute install

You need: a host with Docker Engine 24+ and the Compose v2 plugin.

```bash
git clone https://git.hiten-patel.co.uk/hiten/IronPulse.git
cd Zor/docker
cp .env.example .env

# The only required value — generate a session secret
sed -i "s|^NEXTAUTH_SECRET=.*|NEXTAUTH_SECRET=$(openssl rand -base64 32)|" .env

# Bring everything up
docker compose up -d --build
```

First build takes ~3-5 minutes. Watch progress:

```bash
docker compose logs -f ironpulse
```

When the health endpoint goes green you're done:

```bash
curl -fsS http://localhost:3000/api/health && echo "✓ ready"
```

Open <http://localhost:3000>, sign up, and you have a private Zor instance.

---

## What you get

Every server-side feature, scoped to the users on **your** instance:

| | |
|---|---|
| 💪 Strength | Workouts, exercises, sets, RPE, auto-PRs, supersets, templates |
| 🏃 Cardio | GPS tracking, GPX/FIT import, route maps, laps, elevation |
| 📊 Body | Weight, body fat, measurements, progress photos |
| 🥗 Lifestyle | Nutrition tracking, sleep, goals, achievements, challenges |
| 👥 Social | Activity feed, follow, reactions, shared workouts |
| 🎯 Coaching | Coach/client profiles, programs, messaging (25-client cap) |
| 🔌 Integrations | Strava, Garmin, Polar, Withings, Oura, Apple Health, Google Fit (opt-in) |
| 🛠️ Tools | 1RM calculator, plate calculator, CSV/FIT/GPX import-export |

---

## What's *not* included

- **The published mobile app today still points at the managed cloud.** A runtime "server URL" picker is in flight ([#450](https://git.hiten-patel.co.uk/hiten/IronPulse/issues/450)) — once shipped, the Play Store / TestFlight build will let you point it at your own server with no rebuild. In the meantime:
  - The **web app is fully responsive** and works great on phones with no changes.
  - Or build your own APK: `EXPO_PUBLIC_API_URL=https://your-domain npx eas-cli build --platform android --profile preview`
- **Cross-instance social.** Feed, coaching, and challenges only connect users on the same instance. A solo instance is a private island by design — federation may come later.
- **Push notifications.** Self-hosters supply their own Expo project keys; not bundled.

---

## Stack size — pick what you need

The default `docker compose up -d` runs a **lite core** of 4 services. Heavier optional pieces are gated behind Compose profiles.

| Command | Adds | Use when |
|---|---|---|
| `docker compose up -d` | web, Postgres, Redis, MinIO | Default. Web app with every feature except offline sync. |
| `… --profile sync` | Mongo + PowerSync | You use the **native mobile app** or want offline web sync. |
| `… --profile backup` | Nightly `pg_dump` | **Recommended** for anything beyond a toy install. |
| `… --profile monitoring` | uptime-kuma at :3001 | Status dashboard. |

Combine freely:

```bash
docker compose --profile sync --profile backup --profile monitoring up -d --build
```

Unused profiles cost zero — services aren't created at all.

---

## Configuration

Everything lives in `docker/.env`. Only `NEXTAUTH_SECRET` is mandatory; the rest are safe defaults or feature toggles.

| Variable | Required? | Purpose |
|---|---|---|
| `NEXTAUTH_SECRET` | **yes** | Signs sessions. `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | yes for remote | Public URL users hit. Must match browser/proxy address. |
| `POSTGRES_USER/PASSWORD/DB` | default | DB credentials (internal network only). |
| `OPENAI_API_KEY` | optional | AI workout generation — billed to your key. |
| `GOOGLE_*` / `APPLE_*` | optional | OAuth sign-in. Redirect: `<NEXTAUTH_URL>/api/auth/callback/<provider>`. |
| `RESEND_API_KEY` | optional | Transactional email (password reset). |
| `STRIPE_*` | optional | Coach subscriptions. |
| `MEAL_SCAN_API_KEY` | optional | Photo-based meal scanning. |
| `STRAVA_*` / `GARMIN_*` | optional | Device integrations. |

After editing `.env`:

```bash
docker compose up -d
```

---

## HTTPS & remote access

The app doesn't terminate TLS itself — put a reverse proxy in front of port 3000. Caddy is simplest:

```caddyfile
fitness.example.com {
    reverse_proxy localhost:3000
}
```

Then in `.env`:

```env
NEXTAUTH_URL=https://fitness.example.com
```

`NEXTAUTH_URL` **must** match the address users actually hit — otherwise sign-in callbacks and passkeys break.

Other reverse-proxy snippets (Traefik, nginx, Cloudflare Tunnel) live in [BookStack](https://docs.hiten-patel.co.uk/books/mettle-lift) — open an issue if you want one added here.

---

## Backups & restore

The `backup` service runs nightly `pg_dump` into the `backups` volume.

```bash
# Manual backup
docker compose exec backup /backup.sh

# Restore (DESTRUCTIVE — overwrites the current DB)
docker compose exec backup /restore.sh /backups/<dump-file>.sql.gz
```

Don't forget the `miniodata` volume — that's where progress photos and other uploads live. Snapshot both volumes together for a consistent restore.

---

## Updating

```bash
cd Zor
git pull
cd docker
docker compose up -d --build
```

Migrations run automatically on container start via `entrypoint.sh`. **Take a backup first** for any non-trivial version jump.

---

## Services reference

| Service | Image | Role | Host port | Profile |
|---|---|---|---|---|
| `ironpulse` | built locally | Next.js web app + tRPC API | 3000 | core |
| `postgres` | postgis/postgis:16-3.4 | Primary database | — | core |
| `redis` | redis:7 | Cache / rate limits | — | core |
| `minio` | minio/minio | S3-compatible file storage | 9001 console | core |
| `mongo` | mongo:7 | PowerSync bucket storage | — | `sync` |
| `powersync` | journeyapps/powersync-service | Offline sync backend | 8080 | `sync` |
| `backup` | postgis (cron) | Nightly `pg_dump` | — | `backup` |
| `uptime-kuma` | louislam/uptime-kuma | Status dashboard | 3001 | `monitoring` |

Only `ironpulse:3000` needs to be reachable by users. Keep the rest on the internal Compose network or firewalled.

---

## Troubleshooting

| Symptom | Likely cause |
|---|---|
| App container restarts / "Missing required environment variable" | `NEXTAUTH_SECRET` not set in `.env`. |
| Health check never passes | Check `docker compose logs ironpulse` then `… logs postgres`. The entrypoint retries migrations; persistent failure usually means a bad `DATABASE_URL`. |
| Login redirect loop / callback errors | `NEXTAUTH_URL` doesn't match the URL in the browser. Fix it, `docker compose up -d`. |
| AI workouts say "unavailable" | `OPENAI_API_KEY` unset — expected if not enabled. |
| Need to start fresh (DESTROYS DATA) | `docker compose down -v && docker compose up -d --build`. |

---

## Contributing

Zor is AGPL-3.0. Patches welcome via PR on the [Forgejo repo](https://git.hiten-patel.co.uk/hiten/IronPulse) or the [GitHub mirror](https://github.com/hitenpatel/IronPulse). For non-trivial changes please open an issue first.

The trademark on "Zor" and its logo is reserved — forks must rebrand (see [NOTICE](../NOTICE)).

---

## License

[GNU Affero General Public License v3.0](../LICENSE).
