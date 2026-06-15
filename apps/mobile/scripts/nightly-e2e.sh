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
set -u

# Explicit PATH so this works under cron's minimal environment.
export PATH="$HOME/.maestro/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-arm64}"

DEVICE="${E2E_DEVICE:-100.69.203.52:5555}"
REPO=/home/ubuntu/dev/IronPulse
E2E_APK="${E2E_APK:-/home/ubuntu/dev/IronPulse/apps/mobile/.e2e-build/ironpulse-e2e.apk}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/e2e-reports/$STAMP"
mkdir -p "$OUT"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT/run.log"; }

log "=== nightly e2e $STAMP ==="

# 1. Device — connect, wake, keep awake, dismiss a non-secure keyguard.
# With the phone charging and/or Android Smart Lock (trusted place = home) the
# keyguard is non-secure and this is enough; for a fully secure lock, an
# Automate flow on the phone must keep it awake + unlocked during the window.
adb connect "$DEVICE" 2>&1 | tee -a "$OUT/run.log"
if ! adb -s "$DEVICE" shell true 2>/dev/null; then
  log "FATAL: device $DEVICE not reachable over adb — aborting"
  exit 1
fi
adb -s "$DEVICE" shell input keyevent KEYCODE_WAKEUP 2>/dev/null
adb -s "$DEVICE" shell svc power stayon true 2>/dev/null    # screen stays on while charging
adb -s "$DEVICE" shell wm dismiss-keyguard 2>/dev/null       # works for non-secure keyguard
# Swipe up — on a secure keyguard this at least exposes the PIN pad, surfacing
# the lock-screen vs app-screen distinction in the diagnostic screenshot below.
adb -s "$DEVICE" shell input swipe 540 1800 540 600 200 2>/dev/null
sleep 2

# Diagnostic: capture device state + screenshot so a "no email-input visible"
# failure can be triaged without re-running. The two main wedge states are
# (a) device locked behind a secure keyguard (screenshot shows lock screen) and
# (b) Dreaming/screensaver (mDreamingLockscreen=true).
adb -s "$DEVICE" shell dumpsys window 2>/dev/null \
  | grep -E "mKeyguardOccluded|mShowingDream|mDreamingLockscreen|mCurrentFocus" \
  | head -5 | tee -a "$OUT/run.log"
adb -s "$DEVICE" shell screencap -p /sdcard/_e2e_pre.png 2>/dev/null
adb -s "$DEVICE" pull /sdcard/_e2e_pre.png "$OUT/pre-suite.png" 2>/dev/null | tail -1 | tee -a "$OUT/run.log"

# 2. Test backend — bring up just for this run, tear down after (volumes kept,
# so the seeded test users persist; the entrypoint re-runs idempotent db push +
# base seed on each boot, seed:dev data survives in the pgdata volume).
cleanup_backend() {
  log "stopping test backend (volumes preserved)"
  ( cd "$REPO/docker" && docker compose down >/dev/null 2>&1 )
  adb -s "$DEVICE" shell svc power stayon false 2>/dev/null
}
trap cleanup_backend EXIT

log "starting test backend"
( cd "$REPO/docker" && docker compose up -d --wait --wait-timeout 240 >/dev/null 2>&1 )
for i in $(seq 1 20); do
  curl -fsS --max-time 10 http://100.113.79.51:3000/api/health >/dev/null 2>&1 \
    && { log "test backend healthy"; break; }
  log "  waiting for backend... ($i/20)"; sleep 6
done

# 3. Install the e2e build (coexists with the prod app)
log "installing e2e build"
adb -s "$DEVICE" install -r "$E2E_APK" 2>&1 | tail -1 | tee -a "$OUT/run.log"

# 4. Main suite vs e2e build (rewrite appId -> .e2e)
RUN=/tmp/e2e-run; rm -rf "$RUN"; mkdir -p "$RUN"
cp "$REPO"/apps/mobile/e2e/*.yaml "$RUN"/
# anchored to end-of-line so it never double-suffixes
sed -i 's/^appId: com\.ironpulse\.app$/appId: com.ironpulse.app.e2e/' "$RUN"/*.yaml
log "running main suite ($(ls "$RUN"/*.yaml | wc -l) flows) vs com.ironpulse.app.e2e"
maestro test --udid "$DEVICE" "$RUN" --format junit --output "$OUT/suite.xml" \
  > "$OUT/suite.log" 2>&1
SUITE_RC=$?
log "main suite exit=$SUITE_RC"

# 5. Prod smoke vs shipping build. Capture a pre-smoke screenshot too — if a
# flow fails on "email-input is visible" we want to see what was actually on
# screen at the moment Maestro queried it.
log "running prod smoke vs com.ironpulse.app"
adb -s "$DEVICE" shell screencap -p /sdcard/_e2e_pre_smoke.png 2>/dev/null
adb -s "$DEVICE" pull /sdcard/_e2e_pre_smoke.png "$OUT/pre-smoke.png" 2>/dev/null | tail -1 | tee -a "$OUT/run.log"
maestro test --udid "$DEVICE" "$REPO/apps/mobile/e2e-smoke" --format junit \
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
log "=== done ==="
# backend teardown + stayon restore handled by the EXIT trap (cleanup_backend)
