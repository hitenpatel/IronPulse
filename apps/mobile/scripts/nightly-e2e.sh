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

export PATH="$HOME/.maestro/bin:$PATH"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-21-openjdk-arm64}"

DEVICE="${E2E_DEVICE:-100.69.203.52:5555}"
REPO=/home/ubuntu/dev/IronPulse
E2E_APK="${E2E_APK:-/tmp/ironpulse-e2e.apk}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="/tmp/e2e-reports/$STAMP"
mkdir -p "$OUT"
log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$OUT/run.log"; }

log "=== nightly e2e $STAMP ==="

# 1. Device
adb connect "$DEVICE" 2>&1 | tee -a "$OUT/run.log"
adb -s "$DEVICE" shell input keyevent KEYCODE_WAKEUP 2>/dev/null
if ! adb -s "$DEVICE" shell true 2>/dev/null; then
  log "FATAL: device $DEVICE not reachable over adb — aborting"
  exit 1
fi

# 2. Test backend
log "ensuring test backend is up"
( cd "$REPO/docker" && docker compose up -d >/dev/null 2>&1 )
curl -fsS --max-time 10 http://100.113.79.51:3000/api/health >/dev/null 2>&1 \
  && log "test backend healthy" || log "WARN: test backend health check failed"

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

# 5. Prod smoke vs shipping build
log "running prod smoke vs com.ironpulse.app"
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
