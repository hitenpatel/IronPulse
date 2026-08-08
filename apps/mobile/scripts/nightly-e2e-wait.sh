#!/usr/bin/env bash
# Wrapper: wait for RadioShake nightly Maestro run to finish, then run the
# Zor nightly e2e suite on the shared Pixel 9 Pro XL at 100.69.203.52:5555.
#
# Both projects drive the same physical device via wireless ADB, so the
# suites cannot overlap. RadioShake is scheduled at 02:00 UTC via
# .forgejo/workflows/maestro-nightly.yml; we start at 03:30 UTC and block
# on any RadioShake maestro process (or a stale lock) before installing the
# Zor build.
set -u
export PATH="$HOME/.maestro/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

REPO="${REPO:-/home/ubuntu/dev/IronPulse}"
LOG_DIR="${LOG_DIR:-/home/ubuntu/stack/logs}"
LOCK_DIR="/tmp/pixel-e2e-lock"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-5400}"
POLL_INTERVAL_SECONDS="${POLL_INTERVAL_SECONDS:-30}"

log() { echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*"; }

log "waiting for RadioShake maestro to finish (max ${MAX_WAIT_SECONDS}s)"

waited=0
while [ "$waited" -lt "$MAX_WAIT_SECONDS" ]; do
  radio_running=false
  # Any local maestro process targeting the RadioShake package means the
  # nightly suite is still using the phone.
  if pgrep -af "maestro.*com\.radioshake" >/dev/null 2>&1; then
    radio_running=true
  fi
  # Fallback: a global adb lock left behind by an abrupt maestro exit.
  if [ -d "$LOCK_DIR" ] && [ -f "$LOCK_DIR/owner" ]; then
    owner=$(cat "$LOCK_DIR/owner" 2>/dev/null || true)
    if [ "$owner" = "radioshake" ]; then
      radio_running=true
    fi
  fi
  if [ "$radio_running" = "false" ]; then
    log "device is free — starting Zor nightly"
    break
  fi
  sleep "$POLL_INTERVAL_SECONDS"
  waited=$((waited + POLL_INTERVAL_SECONDS))
done

if [ "$waited" -ge "$MAX_WAIT_SECONDS" ]; then
  log "FATAL: RadioShake still running after ${MAX_WAIT_SECONDS}s — aborting to avoid device contention"
  exit 1
fi

# Claim the lock so any later trigger (RadioShake retry, other project) waits.
mkdir -p "$LOCK_DIR"
echo "zor" > "$LOCK_DIR/owner"
trap 'rm -rf "$LOCK_DIR"' EXIT

mkdir -p "$LOG_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
LOG="$LOG_DIR/zor-e2e-$STAMP.log"
log "handing off to nightly-e2e.sh — log: $LOG"
"$REPO/apps/mobile/scripts/nightly-e2e.sh" >>"$LOG" 2>&1
RC=$?
log "nightly-e2e.sh exit=$RC"
exit $RC
