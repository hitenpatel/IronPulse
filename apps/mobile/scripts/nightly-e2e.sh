#!/usr/bin/env bash
# Nightly mobile e2e.
#
#   - Main suite : apps/mobile/e2e/*.yaml  run against the COEXIST e2e build
#                  (com.ironpulse.app.e2e, pointed at the seeded test backend).
#                  Flow appIds are rewritten to the .e2e package at run time so
#                  the committed flows stay untouched.
#   - Prod smoke : apps/mobile/e2e-smoke/*.yaml run against the SHIPPING build
#                  (com.ironpulse.app, pointed at production) — validates the
#                  literal store artifact boots + authenticates.
#
# Maestro needs the device awake and UNLOCKED to drive the UI.
#
# Exits nonzero on: missing APK, device prep failure, backend health exhaustion,
# install failure, main-suite failure, or smoke failure. Reports are always
# preserved. `set -e` is deliberately not used — several steps intentionally
# capture a nonzero rc (maestro, health polling) and must run the cleanup trap.
set -uo pipefail

# Explicit PATH so this works under cron's minimal environment.
export PATH="$HOME/.maestro/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-arm64}"

DEVICE="${E2E_DEVICE:-100.69.203.52:5555}"
# Derived from the script's own location so a CI checkout runs its own flows,
# compose files and fixtures rather than whatever the developer host has.
REPO="$(cd "$(dirname "$0")/../../.." && pwd)"
E2E_APK="${E2E_APK:-$REPO/apps/mobile/.e2e-build/zor-e2e.apk}"

# Isolated E2E stack (compose project `zor-e2e`): its own postgres/mongo/minio
# volumes and API on :3100, PowerSync on :8180. Kept separate from the shared
# dev stack (project `docker`, API :3000) so teardown here cannot drop dev data.
E2E_API="${E2E_API:-http://100.113.79.51:3100}"
PROD_PKG="com.ironpulse.app"
E2E_PKG="$PROD_PKG.e2e"
E2E_COMPOSE=(docker compose --env-file e2e.env
  -f docker-compose.yml -f docker-compose.e2e.yml --profile sync)
STAMP="$(date +%Y%m%d-%H%M%S)"
# Overridable so a CI job can collect the junit reports from a known path.
OUT="${E2E_OUT_DIR:-/tmp/e2e-reports/$STAMP}"
mkdir -p "$OUT"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT/run.log"; }
fail() { log "FATAL: $*"; log "reports in : $OUT"; exit 1; }

log "=== nightly e2e $STAMP ==="

[ -f "$E2E_APK" ] || fail "e2e apk not found at $E2E_APK (set E2E_APK or run scripts/build-android.sh)"

# 1. Device — connect, wake, keep awake, unlock. All handled by the shared
# prep script (also used by RadioShake's maestro nightly): pins the screen on
# while charging via stay_on_while_plugged_in=7, disables doze/screensaver,
# wakes with KEYCODE_POWER, and falls back to swipe + per-digit PIN entry
# (from ADB_PIN or /home/ubuntu/stack/.e2e-device-pin) with retries.
PREP="$(dirname "$0")/adb-device-prep.sh"
OUT_DIR="$OUT" E2E_DEVICE="$DEVICE" bash "$PREP" prep "$DEVICE" 2>&1 | tee -a "$OUT/run.log"
if [ "${PIPESTATUS[0]}" -ne 0 ]; then
  fail "device prep/unlock failed"
fi

# Diagnostic: capture device state + screenshot so a "no email-input visible"
# failure can be triaged without re-running. The two main wedge states are
# (a) device locked behind a secure keyguard (screenshot shows lock screen) and
# (b) Dreaming/screensaver (mDreamingLockscreen=true).
adb -s "$DEVICE" shell dumpsys window 2>/dev/null \
  | grep -E "mKeyguardOccluded|mShowingDream|mDreamingLockscreen|mCurrentFocus" \
  | head -5 | tee -a "$OUT/run.log"
adb -s "$DEVICE" shell screencap -p /sdcard/_e2e_pre.png 2>/dev/null
adb -s "$DEVICE" pull /sdcard/_e2e_pre.png "$OUT/pre-suite.png" 2>/dev/null | tail -1 | tee -a "$OUT/run.log"

# 1b. Small-screen gate. The layouts must be evidenced at 360-412dp; the
# connected Pixel 9 Pro XL is 1008px @ 360dpi = 448dp, wider than any phone we
# claim to support. Override density rather than resolution — resizing the
# framebuffer forces a surface recreate that some Compose/RN surfaces survive
# badly, whereas a density change is a plain configuration change.
#
#   target_density = physical_width_px * 160 / target_dp
#   1008 * 160 / 384dp = 420dpi
#
# Restored by the EXIT trap so the shared phone is left as found. The trap is
# installed *before* the override, so a failed gate can't strand the device at a
# non-native density — RadioShake's nightly drives the same phone.
MAESTRO_DEVICE="$DEVICE"
TUNNEL_PID=""
cleanup() {
  log "restoring device density"
  adb -s "$DEVICE" shell wm density reset >/dev/null 2>&1
  adb -s "$DEVICE" shell wm size reset >/dev/null 2>&1
  log "stopping zor-e2e stack (volumes preserved)"
  ( cd "$REPO/docker" && "${E2E_COMPOSE[@]}" down >/dev/null 2>&1 )
  if [ -n "$TUNNEL_PID" ]; then
    adb disconnect "$MAESTRO_DEVICE" >/dev/null 2>&1
    kill "$TUNNEL_PID" >/dev/null 2>&1
  fi
  bash "$PREP" restore "$DEVICE" 2>&1 | tee -a "$OUT/run.log"
}
trap cleanup EXIT

TARGET_DP="${E2E_TARGET_DP:-384}"
PHYS_W="$(adb -s "$DEVICE" shell wm size | grep -oE '[0-9]+x' | tr -d 'x' | tr -d '\r')"
[ -n "$PHYS_W" ] || fail "could not read physical width from 'wm size'"
TARGET_DENSITY=$(( PHYS_W * 160 / TARGET_DP ))
adb -s "$DEVICE" shell wm density "$TARGET_DENSITY" >/dev/null 2>&1
EFFECTIVE_DP=$(( PHYS_W * 160 / TARGET_DENSITY ))
log "small-screen gate: ${PHYS_W}px @ ${TARGET_DENSITY}dpi = ${EFFECTIVE_DP}dp"
if [ "$EFFECTIVE_DP" -lt 360 ] || [ "$EFFECTIVE_DP" -gt 412 ]; then
  fail "effective width ${EFFECTIVE_DP}dp outside the required 360-412dp gate"
fi

# 1c. Maestro's embedded dadb adb client cannot drive a non-loopback network
# serial: every request dies with `Command failed (tcp:N): closed` before the
# on-device driver is even installed, while plain adb on the same serial is
# fine. Proxy the device to a loopback serial and point maestro (only) at
# that; adb and the prep script keep the raw serial. socat is unavailable on
# this host, hence python.
case "$DEVICE" in
  127.0.0.1:*|localhost:*|emulator-*) ;;
  *:*)
    TUNNEL_PORT="${E2E_TUNNEL_PORT:-5556}"
    python3 - "$TUNNEL_PORT" "${DEVICE%%:*}" "${DEVICE##*:}" >>"$OUT/run.log" 2>&1 <<'PYEOF' &
import socket, threading, sys
port, thost, tport = int(sys.argv[1]), sys.argv[2], int(sys.argv[3])
def pipe(a, b):
    try:
        while True:
            d = a.recv(65536)
            if not d:
                break
            b.sendall(d)
    except OSError:
        pass
    finally:
        for s in (a, b):
            try:
                s.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass
srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("127.0.0.1", port))
srv.listen(64)
while True:
    c, _ = srv.accept()
    try:
        up = socket.create_connection((thost, tport))
    except OSError:
        c.close()
        continue
    threading.Thread(target=pipe, args=(c, up), daemon=True).start()
    threading.Thread(target=pipe, args=(up, c), daemon=True).start()
PYEOF
    TUNNEL_PID=$!
    MAESTRO_DEVICE="127.0.0.1:$TUNNEL_PORT"
    sleep 1
    adb connect "$MAESTRO_DEVICE" >>"$OUT/run.log" 2>&1
    adb -s "$MAESTRO_DEVICE" get-state 2>/dev/null | grep -q device \
      || fail "loopback tunnel serial $MAESTRO_DEVICE not usable (port $TUNNEL_PORT busy?)"
    log "maestro serial: $MAESTRO_DEVICE (tunnel pid $TUNNEL_PID -> $DEVICE)"
    ;;
esac

# 2. Test backend — bring up just for this run, tear down after (volumes kept,
# so the seeded test users persist; the entrypoint re-runs idempotent db push +
# base seed on each boot, seed:dev data survives in the pgdata volume).
# PowerSync configs (powersync.yaml, sync-rules.yaml) are now baked into
# the e2e-only image built via docker/powersync/Dockerfile — no bind mount,
# so daemon-visibility of the checkout no longer matters. Probe removed.

log "starting zor-e2e stack (api :3100, powersync :8180)"
# Compose output goes to BOTH stdout and run.log via tee: last four nightlies
# failed inside `up --build`, but the failure reason lived only in run.log —
# which is uploaded as an artifact whose download URL is not fetchable outside
# the web UI. Duplicating to stdout lands the actual error in the job log.
# `pipefail` is on, so the compose rc is what tee's pipeline exits with.
#
# Services are listed explicitly: `--wait` with no arguments also waits on the
# one-shot minio-init and reports its clean exit as a failure. depends_on still
# pulls the init containers in.
# --build: the API container applies the schema (prisma db push) from the copy
# of packages/db baked into its image, so a stale image silently reverts schema
# changes made in the checkout — which then surfaces as a seed/query error far
# from the cause. Layer cache makes this a no-op when nothing changed.
if ! ( cd "$REPO/docker" && "${E2E_COMPOSE[@]}" up -d --build --wait --wait-timeout 300 \
    postgres redis minio mongo ironpulse powersync ) 2>&1 | tee -a "$OUT/run.log"; then
  log "compose bring-up failed — dumping per-service state + last 100 lines of each container's logs"
  ( cd "$REPO/docker" && "${E2E_COMPOSE[@]}" ps -a ) 2>&1 | tee -a "$OUT/run.log" || true
  for svc in postgres redis minio mongo ironpulse powersync; do
    log "--- logs: $svc ---"
    ( cd "$REPO/docker" && "${E2E_COMPOSE[@]}" logs --tail=100 --no-color "$svc" ) 2>&1 \
      | tee -a "$OUT/run.log" || true
  done
  fail "zor-e2e stack did not come up (see $OUT/run.log + inline dump above)"
fi
BACKEND_UP=0
for i in $(seq 1 20); do
  if curl -fsS --max-time 10 "$E2E_API/api/health" >/dev/null 2>&1; then
    log "e2e api healthy"; BACKEND_UP=1; break
  fi
  log "  waiting for api... ($i/20)"; sleep 6
done
[ "$BACKEND_UP" = "1" ] || fail "e2e api never became healthy at $E2E_API/api/health"

# PowerSync must be reachable from the phone, not just from this host: the app
# gets its sync endpoint from the API at runtime and a stubbed/unreachable
# PowerSync leaves every data screen empty, which reads as a selector failure.
curl -fsS --max-time 10 http://100.113.79.51:8180/probes/liveness >/dev/null 2>&1 \
  || fail "powersync not answering on http://100.113.79.51:8180"
log "powersync healthy"

E2E_DATABASE_URL="${E2E_DATABASE_URL:-postgresql://zor_e2e:zor_e2e@localhost:5532/zor_e2e}"

# The container entrypoint only runs the base seed (exercise library). The test
# users (test@example.com etc.) come from the dev seed, which skips itself when
# its data is already present — so this is a no-op on every run but the first
# boot of a fresh pgdata volume.
log "ensuring dev seed users"
# Tee seed output to both run.log AND stdout so a seed failure is
# visible in the CI job log directly; the artifact download path on
# Forgejo is not reliable (see [[feedback_forgejo_artifact_download]]).
( cd "$REPO" && DATABASE_URL="$E2E_DATABASE_URL" \
  pnpm --filter @zor/db db:seed:dev ) 2>&1 \
  | tee -a "$OUT/run.log" \
  || fail "dev seed failed (see $OUT/run.log + inline dump above)"

# Deterministic fixture state — resets only the designated test user's workout
# graph, leaving the exercise library and other users intact.
# Stop any running e2e app first: a live app holds the old workout graph in its
# local PowerSync DB and would re-upload it right after the server-side reset.
adb -s "$DEVICE" shell am force-stop "$E2E_PKG" >/dev/null 2>&1 || true
log "resetting e2e workout fixtures"
E2E_IDS="$OUT/fixture-ids.json"
( cd "$REPO" && DATABASE_URL="$E2E_DATABASE_URL" E2E_IDS_OUT="$E2E_IDS" \
  pnpm --filter @zor/db db:reset:e2e ) 2>&1 \
  | tee -a "$OUT/run.log" \
  || fail "e2e fixture reset failed (see $OUT/run.log + inline dump above)"
[ -s "$E2E_IDS" ] || fail "fixture reset produced no id manifest at $E2E_IDS"

# 3. Install the e2e build (coexists with the prod app).
#
# Uninstall first: every build host generates its own debug.keystore, so an APK
# from CI won't match the signature of one a developer sideloaded, and `install
# -r` fails with INSTALL_FAILED_UPDATE_INCOMPATIBLE. This is a test package, so
# losing its app data is fine — the fixture reset already assumes a clean slate.
log "installing e2e build"
adb -s "$DEVICE" uninstall "$E2E_PKG" >/dev/null 2>&1 || true
# -t allows the test-only flag; -g pre-grants dangerous permissions so first
# launch cannot pop a system dialog that the preflight reads as a crash.
INSTALL_OUT="$(adb -s "$DEVICE" install -t -g "$E2E_APK" 2>&1)"
echo "$INSTALL_OUT" | tail -2 | tee -a "$OUT/run.log"
echo "$INSTALL_OUT" | grep -q '^Success$' || fail "adb install of $E2E_APK failed"

# `-g` skips POST_NOTIFICATIONS on Android 13+ (the runtime treats it as
# user-only), so grant everything the app declares explicitly.
for PERM in \
  android.permission.POST_NOTIFICATIONS \
  android.permission.CAMERA \
  android.permission.ACCESS_FINE_LOCATION \
  android.permission.ACCESS_COARSE_LOCATION \
  android.permission.ACCESS_BACKGROUND_LOCATION \
  android.permission.READ_MEDIA_IMAGES \
  android.permission.ACTIVITY_RECOGNITION \
  android.permission.BODY_SENSORS; do
  adb -s "$DEVICE" shell pm grant "$E2E_PKG" "$PERM" >/dev/null 2>&1 || true
done

# Preflight: a crash-on-launch otherwise shows up as 42 identical "element not
# found" failures, which reads like selector drift rather than a broken build.
log "preflight: launching $E2E_PKG"
adb -s "$DEVICE" shell am force-stop "$E2E_PKG"
adb -s "$DEVICE" shell monkey -p "$E2E_PKG" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1
sleep 6
RESUMED="$(adb -s "$DEVICE" shell dumpsys activity activities | grep -m1 ResumedActivity)"
if echo "$RESUMED" | grep -q "permissioncontroller"; then
  adb -s "$DEVICE" shell input keyevent KEYCODE_BACK; sleep 2
  RESUMED="$(adb -s "$DEVICE" shell dumpsys activity activities | grep -m1 ResumedActivity)"
fi
log "preflight resumed: $RESUMED"
echo "$RESUMED" | grep -q "$E2E_PKG" || fail "$E2E_PKG is not the resumed activity — launch crashed"

# 4. Main suite vs e2e build (rewrite appId -> .e2e)
RUN=/tmp/e2e-run; rm -rf "$RUN"; mkdir -p "$RUN"
cp "$REPO"/apps/mobile/e2e/*.yaml "$RUN"/
# anchored to end-of-line so it never double-suffixes
sed -i "s/^appId: ${PROD_PKG//./\\.}\$/appId: $E2E_PKG/" "$RUN"/*.yaml

# Exercise rows are keyed `exercise-option-<uuid>` and the library seeds those
# UUIDs randomly, so flows carry __EXERCISE_*__ placeholders that only the
# fixture reset can resolve. Substitute them into the copies, then assert none
# survive — an unsubstituted placeholder would fail as a missing element and
# read like a UI regression.
while IFS=$'\t' read -r KEY VAL; do
  sed -i "s/__${KEY}__/${VAL}/g" "$RUN"/*.yaml
done < <(python3 -c 'import json,sys
for k, v in json.load(open(sys.argv[1])).items(): print(f"{k}\t{v}")' "$E2E_IDS")
if grep -l '__[A-Z_]*__' "$RUN"/*.yaml >/dev/null 2>&1; then
  fail "unresolved placeholders in $(grep -lo '__[A-Z_]*__' "$RUN"/*.yaml | tr '\n' ' ')"
fi

# `subflow` is _login.yaml, which is only ever reached via runFlow but still
# needs an appId to parse. `orchestrated` is the offline sequence below, which
# has to interleave docker commands Maestro cannot issue itself.
log "running main suite vs $E2E_PKG"
maestro test --udid "$MAESTRO_DEVICE" "$RUN" --exclude-tags subflow,orchestrated \
  --format junit --output "$OUT/suite.xml" > "$OUT/suite.log" 2>&1
SUITE_RC=$?
log "main suite exit=$SUITE_RC"

# 4b. Offline completion (AC#6). Offline is induced by stopping the isolated
# backend services, never by touching Wi-Fi or Tailscale — severing either
# would take ADB down with it and strand the shared phone mid-run.
log "offline phase: setup"
OFFLINE_RC=0
maestro test --udid "$MAESTRO_DEVICE" "$RUN/workout-focus-offline-setup.yaml" \
  >> "$OUT/offline.log" 2>&1 || OFFLINE_RC=1

if [ "$OFFLINE_RC" = "0" ]; then
  log "offline phase: stopping ironpulse + powersync"
  ( cd "$REPO/docker" && "${E2E_COMPOSE[@]}" stop ironpulse powersync ) >>"$OUT/run.log" 2>&1

  maestro test --udid "$MAESTRO_DEVICE" "$RUN/workout-focus-offline.yaml" \
    >> "$OUT/offline.log" 2>&1 || OFFLINE_RC=1

  log "offline phase: restarting ironpulse + powersync"
  ( cd "$REPO/docker" && "${E2E_COMPOSE[@]}" start ironpulse powersync ) >>"$OUT/run.log" 2>&1
  BACK=0
  for i in $(seq 1 20); do
    curl -fsS --max-time 10 "$E2E_API/api/health" >/dev/null 2>&1 && { BACK=1; break; }
    sleep 6
  done
  [ "$BACK" = "1" ] || fail "e2e api did not recover after the offline phase"

  maestro test --udid "$MAESTRO_DEVICE" "$RUN/workout-focus-offline-verify.yaml" \
    >> "$OUT/offline.log" 2>&1 || OFFLINE_RC=1
fi
log "offline phase exit=$OFFLINE_RC"

# 4c. Superset (AC#1). Supersets cannot be built through the UI, so the flow
# resumes a seeded in-progress workout instead. That workout is seeded here
# rather than in the main reset because an incomplete workout always wins the
# dashboard's Continue Workout slot and would hijack every flow that expects to
# start a fresh session — so it must not exist until everything else has run.
log "superset phase: seeding fixture"
SUPERSET_RC=0
( cd "$REPO" && DATABASE_URL="$E2E_DATABASE_URL" \
  pnpm --filter @zor/db db:seed:e2e:superset ) \
  >>"$OUT/run.log" 2>&1 || fail "superset fixture seed failed (see $OUT/run.log)"

maestro test --udid "$MAESTRO_DEVICE" "$RUN/workout-focus-superset.yaml" \
  > "$OUT/superset.log" 2>&1 || SUPERSET_RC=1
log "superset phase exit=$SUPERSET_RC"

# 5. Prod smoke vs shipping build. Capture a pre-smoke screenshot too — if a
# flow fails on "email-input is visible" we want to see what was actually on
# screen at the moment Maestro queried it.
log "running prod smoke vs com.ironpulse.app"
adb -s "$DEVICE" shell screencap -p /sdcard/_e2e_pre_smoke.png 2>/dev/null
adb -s "$DEVICE" pull /sdcard/_e2e_pre_smoke.png "$OUT/pre-smoke.png" 2>/dev/null | tail -1 | tee -a "$OUT/run.log"
maestro test --udid "$MAESTRO_DEVICE" "$REPO/apps/mobile/e2e-smoke" --format junit \
  --output "$OUT/smoke.xml" > "$OUT/smoke.log" 2>&1
SMOKE_RC=$?
log "prod smoke exit=$SMOKE_RC"

# 6. Summary
summarize() { # $1 = junit xml
  [ -f "$1" ] && grep -oE 'tests="[0-9]+" failures="[0-9]+"( errors="[0-9]+")?' "$1" | head -1 || echo "(no report)"
}
log "---- RESULTS ----"
log "main suite : $(summarize "$OUT/suite.xml")"
log "prod smoke : $(summarize "$OUT/smoke.xml")"
log "reports in : $OUT"

RC=0
[ "$SUITE_RC" -ne 0 ] && { log "main suite FAILED (exit $SUITE_RC)"; RC=1; }
[ "$OFFLINE_RC" -ne 0 ] && { log "offline phase FAILED (see $OUT/offline.log)"; RC=1; }
[ "$SUPERSET_RC" -ne 0 ] && { log "superset phase FAILED (see $OUT/superset.log)"; RC=1; }
[ "$SMOKE_RC" -ne 0 ] && { log "prod smoke FAILED (exit $SMOKE_RC)"; RC=1; }
[ -f "$OUT/suite.xml" ] || { log "main suite produced no junit report"; RC=1; }
[ -f "$OUT/smoke.xml" ] || { log "prod smoke produced no junit report"; RC=1; }
log "=== done (exit $RC) ==="
# density reset, backend teardown and stayon restore handled by the EXIT trap
exit $RC
