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
#     KEYCODE_<n> events.
#   - `dumpsys trust` deviceLocked=<0|1> is the ground truth for lock state;
#     window dumps (mDreamingLockscreen etc) lag and misreport.
#   - Android 17 (Sept 2026): when the device is locked AND untrusted
#     (deviceLocked=1), `wm dismiss-keyguard` and KEYCODE_MENU raise the
#     fingerprint-only AlternateBouncer (SystemUI isAlternateBouncerShowing=true,
#     focus AlternateBouncerView), never the PIN pad, and digit keyevents go
#     nowhere. So the locked path never calls dismiss-keyguard. Sequence that
#     works: STOP_DREAM + KEYCODE_WAKEUP (wait mWakefulness=Awake); BACK if an
#     AlternateBouncer is up; slow swipe from the plain lockscreen (x=w/2,
#     ~0.87h -> ~0.22h, sized from `wm size`); wait for SystemUI
#     isPrimaryBouncerShowingOrWillBeShowing=true; only then type the digits.
#     The low-light clock dream re-engages within seconds when idle on charge,
#     hence STOP_DREAM + WAKEUP at the start of every attempt.
#   - The phone auto-confirms the PIN on the last digit; ENTER is sent only if
#     still locked afterwards (a stray ENTER lands in the foreground app).
#   - `wm dismiss-keyguard` is kept only for a TRUSTED device (deviceLocked=0)
#     whose keyguard is still showing.
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

keyguard_up() { adbd shell dumpsys window 2>/dev/null | grep -m1 -q 'isKeyguardShowing=true'; }

SYSUI_SVC=com.android.systemui/.SystemUIService
primary_bouncer_up() {
  adbd shell dumpsys activity service "$SYSUI_SVC" 2>/dev/null \
    | grep -m1 -q 'isPrimaryBouncerShowingOrWillBeShowing=true'
}
alt_bouncer_up() {
  adbd shell dumpsys activity service "$SYSUI_SVC" 2>/dev/null \
    | grep -m1 -q 'isAlternateBouncerShowing=true' && return 0
  adbd shell dumpsys window 2>/dev/null | grep -m1 'mCurrentFocus' | grep -q 'AlternateBouncerView'
}

# Dream (low-light clock) re-engages within seconds when idle on charge, and
# the lockscreen only takes the swipe while the screen is awake.
wake_screen() {
  adbd shell am broadcast -a android.intent.action.STOP_DREAM >/dev/null 2>&1 || true
  adbd shell input keyevent KEYCODE_WAKEUP
  for _ in 1 2 3 4 5; do
    is_awake && return 0
    sleep 1
  done
  is_awake
}

# Swipe geometry from `wm size` (Override size wins over Physical size).
SW_X=504 SW_Y1=1950 SW_Y2=500
compute_swipe() {
  local out dims w h
  out=$(adbd shell wm size 2>/dev/null | tr -d '\r')
  dims=$(printf '%s\n' "$out" | sed -n 's/^Override size: *\([0-9][0-9]*x[0-9][0-9]*\).*/\1/p' | head -1)
  [ -n "$dims" ] || dims=$(printf '%s\n' "$out" | sed -n 's/^Physical size: *\([0-9][0-9]*x[0-9][0-9]*\).*/\1/p' | head -1)
  w=${dims%x*}; h=${dims#*x}
  if [[ "$w" =~ ^[0-9]+$ && "$h" =~ ^[0-9]+$ && "$w" -gt 0 && "$h" -gt 0 ]]; then
    SW_X=$(( w / 2 )); SW_Y1=$(( h * 87 / 100 )); SW_Y2=$(( h * 22 / 100 ))
  else
    log "could not parse 'wm size'; using default swipe 504 1950 500"
  fi
}

# A trusted device (Extend Unlock, trusted place/Wi-Fi) reports deviceLocked=0
# while the keyguard is still SHOWING; KEYCODE_HOME does not clear that, so the
# app under test renders behind the lockscreen. `wm dismiss-keyguard` clears a
# trusted keyguard outright. It must NOT run while locked: on Android 17 it
# raises the AlternateBouncer (no PIN pad) instead.
LOCKED=0
if is_locked; then
  LOCKED=1
elif keyguard_up; then
  adbd shell wm dismiss-keyguard; sleep 1.5
fi

if [ "$LOCKED" = 1 ]; then
  PIN="${ADB_PIN:-}"
  if [ -z "$PIN" ] && [ -r "$PIN_FILE" ]; then
    PIN=$(tr -d '\r\n\t ' < "$PIN_FILE")
  fi
  if [ -z "$PIN" ]; then
    log "ERROR: device locked and no PIN (set ADB_PIN or provide $PIN_FILE)."
    snap locked-no-pin
    exit 1
  fi
  compute_swipe
  for attempt in 1 2 3; do
    log "unlock attempt $attempt: swipe to PIN bouncer + ${#PIN}-digit PIN"
    wake_screen || log "attempt $attempt: screen not Awake after wake"
    if alt_bouncer_up; then
      log "attempt $attempt: AlternateBouncer showing; BACK to plain lockscreen"
      adbd shell input keyevent KEYCODE_BACK; sleep 1
    fi
    adbd shell input swipe "$SW_X" "$SW_Y1" "$SW_X" "$SW_Y2" 600
    shown=0
    for _ in 1 2 3 4 5 6; do
      sleep 0.5
      if primary_bouncer_up; then shown=1; break; fi
    done
    if [ "$shown" = 0 ]; then
      log "attempt $attempt: primary PIN bouncer not showing after swipe; not typing PIN"
      snap "unlock-attempt-$attempt"
    else
      for (( i=0; i<${#PIN}; i++ )); do
        adbd shell input keyevent "KEYCODE_${PIN:$i:1}"
        sleep 0.2
      done
      sleep 1.5
      # PIN auto-confirms on the last digit; only press ENTER if still locked.
      if is_locked; then
        adbd shell input keyevent KEYCODE_ENTER
        sleep 2
      fi
      is_locked || break
      log "still locked after PIN"
      snap "unlock-attempt-$attempt"
    fi
    # Reset between attempts: BACK + re-wake (power off/on would re-lock and re-dream).
    adbd shell input keyevent KEYCODE_BACK; sleep 1
    wake_screen || true
  done
fi

# Once auth is satisfied (deviceLocked=0) the keyguard can linger on screen;
# dismiss it and confirm it is gone. Never while still locked (see above).
if ! is_locked; then
  for _ in 1 2 3; do
    keyguard_up || break
    adbd shell wm dismiss-keyguard
    sleep 1
  done
fi

if is_locked || keyguard_up; then
  log "ERROR: device still locked / keyguard showing after unlock attempts."
  snap unlock-failed
  exit 1
fi

adbd shell input keyevent KEYCODE_HOME
log "$DEVICE awake + unlocked (deviceLocked=0, keyguard dismissed); screen pinned on while charging"
