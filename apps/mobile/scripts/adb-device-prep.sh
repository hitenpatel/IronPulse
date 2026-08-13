#!/usr/bin/env bash
# adb-device-prep.sh — wake, unlock, and keep-awake a shared Android test device.
#
# Shared between Zor mobile E2E (this repo, called by nightly-e2e.sh) and
# RadioShake's maestro nightly (which calls the installed copy at
# /home/ubuntu/stack/adb-device-prep.sh on the runner host). Keep the two
# copies in sync: this file is canonical; install with
#   cp apps/mobile/scripts/adb-device-prep.sh /home/ubuntu/stack/ && chmod +x /home/ubuntu/stack/adb-device-prep.sh
#
# Usage:
#   adb-device-prep.sh [prep|restore] [device_serial]
#
#   prep     (default) connect, disable doze/screensaver, keep screen on while
#            charging, wake, and unlock (PIN fallback). Exits 0 only when the
#            device reports deviceLocked=0.
#   restore  undo the keep-awake settings so the phone behaves normally as a
#            daily driver again. Does NOT sleep the screen — callers decide.
#
# Environment:
#   E2E_DEVICE    adb serial            (default 100.69.203.52:5555)
#   ADB_PIN       lockscreen PIN        (takes precedence over ADB_PIN_FILE)
#   ADB_PIN_FILE  path to 0600 PIN file (default /home/ubuntu/stack/.e2e-device-pin)
#   OUT_DIR       if set, diagnostic screenshots are written here on failure
#
# Device-specific notes (Pixel 9 Pro XL, Android 17, work profile):
#   - `svc power stayon true` is ineffective over wireless debugging; the
#     work policy also blocks the developer "Stay awake" toggle. Writing
#     `settings put global stay_on_while_plugged_in 7` bypasses both and keeps
#     the screen on while charging, so the device cannot re-lock mid-suite.
#   - KEYCODE_POWER (not KEYCODE_WAKEUP) is required to leave Dozing.
#   - `input text` is blocked on the secure keyguard; PIN goes in as per-digit
#     KEYCODE_<n> events after a slow full-height swipe. Fast swipes are
#     sometimes ignored, and the fingerprint-only AlternateBouncerView eats
#     digit keyevents — the slow swipe reliably lands on the keypad bouncer.
#   - `dumpsys trust` deviceLocked=<0|1> is the ground truth for lock state;
#     window dumps (mDreamingLockscreen etc) lag and misreport.
set -u

MODE="${1:-prep}"
DEVICE="${2:-${E2E_DEVICE:-100.69.203.52:5555}}"
PIN_FILE="${ADB_PIN_FILE:-/home/ubuntu/stack/.e2e-device-pin}"

adbd() { adb -s "$DEVICE" "$@"; }
log() { echo "[adb-device-prep] $*"; }

snap() { # snap <name> — diagnostic screenshot if OUT_DIR is set
  [ -n "${OUT_DIR:-}" ] || return 0
  adbd exec-out screencap -p > "$OUT_DIR/$1.png" 2>/dev/null || true
}

# ── connect (with retry; `adb connect` returns 0 even for offline devices) ──
if [[ "$DEVICE" == *:* ]]; then
  for i in 1 2 3; do
    adb connect "$DEVICE" >/dev/null 2>&1
    adbd shell true >/dev/null 2>&1 && break
    log "adb connect attempt $i failed; retrying"
    sleep 5
  done
fi
if ! adbd shell true >/dev/null 2>&1; then
  log "ERROR: $DEVICE unreachable over adb. Wireless debugging is likely off (phone reboot / OS update)."
  log "Recover: toggle Wireless debugging on the device, connect on the ephemeral port shown there, then run 'adb tcpip 5555' to re-pin the port."
  exit 1
fi

if [ "$MODE" = "restore" ]; then
  adbd shell settings put secure screensaver_enabled 1 || true
  adbd shell settings put global stay_on_while_plugged_in 0 || true
  adbd shell settings put system screen_off_timeout 30000 || true
  adbd shell svc power stayon false || true
  adbd shell dumpsys deviceidle enable >/dev/null 2>&1 || true
  log "restored daily-driver power settings on $DEVICE"
  exit 0
fi

# ── keep-awake: screen stays on while charging, no doze/dream re-lock ──
adbd shell settings put global stay_on_while_plugged_in 7
adbd shell settings put secure screensaver_enabled 0
adbd shell settings put secure doze_enabled 0 || true
adbd shell settings put secure doze_always_on 0 || true
adbd shell settings put system screen_off_timeout 1800000
adbd shell svc power stayon true || true
# Deep doze (deviceidle deep=ACTIVE) swallows wake keyevents entirely —
# observed after ~10min idle even while charging. Disable the idle machinery
# for the run; re-enabled in restore.
adbd shell dumpsys deviceidle disable >/dev/null 2>&1 || true
adbd shell am broadcast -a android.intent.action.STOP_DREAM >/dev/null 2>&1 || true
sleep 1

# ── wake ──
# KEYCODE_WAKEUP first: it is wake-only, so it can never turn the screen off.
# KEYCODE_POWER as fallback (WAKEUP has been seen to no-op from Dozing), but
# only after a multi-second poll — the wake transition can take >1s, and a
# second POWER sent too early toggles the screen straight back off.
is_awake() { adbd shell dumpsys power | grep -q 'mWakefulness=Awake'; }
for key in KEYCODE_WAKEUP KEYCODE_POWER KEYCODE_WAKEUP KEYCODE_POWER; do
  is_awake && break
  adbd shell input keyevent "$key"
  for _ in 1 2 3; do
    sleep 1
    is_awake && break 2
  done
done
if ! is_awake; then
  log "ERROR: device would not wake (still not mWakefulness=Awake)."
  snap wake-failed
  exit 1
fi

is_locked() { adbd shell dumpsys trust 2>/dev/null | grep -m1 -q 'deviceLocked=1'; }

if is_locked; then
  # Kick Extend Unlock (trusted device/place) — it unlocks asynchronously.
  adbd shell input swipe 500 2000 500 500 300
  for _ in 1 2 3 4 5 6 7 8; do
    sleep 1
    is_locked || break
  done
fi

if is_locked; then
  PIN="${ADB_PIN:-}"
  if [ -z "$PIN" ] && [ -r "$PIN_FILE" ]; then
    PIN=$(tr -d '\r\n\t ' < "$PIN_FILE")
  fi
  if [ -z "$PIN" ]; then
    log "ERROR: device locked and no PIN (set ADB_PIN or provide $PIN_FILE)."
    snap locked-no-pin
    exit 1
  fi
  for attempt in 1 2 3; do
    log "unlock attempt $attempt: swipe + ${#PIN}-digit PIN"
    adbd shell input swipe 500 2100 500 200 800
    sleep 1.5
    for (( i=0; i<${#PIN}; i++ )); do
      adbd shell input keyevent "KEYCODE_${PIN:$i:1}"
      sleep 0.2
    done
    # 4-digit PINs auto-submit on Pixel; longer PINs need ENTER.
    if [ "${#PIN}" -gt 4 ]; then
      adbd shell input keyevent KEYCODE_ENTER
    fi
    sleep 2
    is_locked || break
    log "still locked; cycling screen to reset the bouncer"
    snap "unlock-attempt-$attempt"
    adbd shell input keyevent KEYCODE_POWER; sleep 1   # screen off
    adbd shell input keyevent KEYCODE_POWER; sleep 1   # wake again
  done
fi

if is_locked; then
  log "ERROR: device still locked after PIN attempts."
  snap unlock-failed
  exit 1
fi

adbd shell input keyevent KEYCODE_HOME
log "$DEVICE awake + unlocked (deviceLocked=0); screen pinned on while charging"
