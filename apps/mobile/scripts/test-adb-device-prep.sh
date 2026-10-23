#!/usr/bin/env bash
# Offline test for adb-device-prep.sh: a fake `adb` (and no-op `sleep`) on PATH
# models the Android 17 lockscreen. Never touches a real device.
# Run from the repo root: bash apps/mobile/scripts/test-adb-device-prep.sh
set -u

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPT="$HERE/adb-device-prep.sh"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/bin"
TEST_PIN=123456

cat > "$TMP/bin/sleep" <<'SLEEP'
#!/bin/sh
exit 0
SLEEP

# Fake adb state (files in $FAKE_DIR): locked, keyguard, bouncer (plain|alt|primary), typed.
# Env: FAKE_MODE=primary|never_primary, FAKE_AUTOCONFIRM=1|0, FAKE_PIN.
cat > "$TMP/bin/adb" <<'FAKE'
#!/usr/bin/env bash
get() { cat "$FAKE_DIR/$1"; }
set_() { printf '%s' "$2" > "$FAKE_DIR/$1"; }
unlock() { set_ locked 0; set_ keyguard 0; set_ bouncer plain; }

case "${1:-}" in
  connect) echo "connected to ${2:-}"; exit 0 ;;
  -s) shift 2 ;;
esac
sub="${1:-}"; shift || true
cmd="$*"   # `adb shell` joins args, so "shell a b" and "shell 'a b'" are the same
echo "$sub $cmd" >> "$FAKE_DIR/calls.log"

[ "$sub" = exec-out ] && exit 0
case "$cmd" in
  true) ;;
  "dumpsys power") echo "  mWakefulness=Awake" ;;
  "dumpsys trust") echo "  User 0: deviceLocked=$(get locked)" ;;
  "dumpsys window")
    [ "$(get keyguard)" = 1 ] && echo "  isKeyguardShowing=true" || echo "  isKeyguardShowing=false"
    if [ "$(get bouncer)" = alt ]; then echo "  mCurrentFocus=Window{1 u0 AlternateBouncerView}"
    else echo "  mCurrentFocus=Window{1 u0 NotificationShade}"; fi ;;
  "dumpsys activity service com.android.systemui/.SystemUIService")
    [ "$(get bouncer)" = alt ] && echo "  isAlternateBouncerShowing=true" || echo "  isAlternateBouncerShowing=false"
    [ "$(get bouncer)" = primary ] && echo "  isPrimaryBouncerShowingOrWillBeShowing=true" || echo "  isPrimaryBouncerShowingOrWillBeShowing=false" ;;
  "wm size") echo "Physical size: 1008x2244" ;;
  "wm dismiss-keyguard")
    if [ "$(get locked)" = 1 ]; then set_ bouncer alt; else set_ keyguard 0; fi ;;
  "input keyevent KEYCODE_BACK") [ "$(get bouncer)" = alt ] && set_ bouncer plain ;;
  "input swipe "*)
    if [ "$(get locked)" = 1 ]; then
      if [ "${FAKE_MODE:-primary}" = primary ] && [ "$(get bouncer)" = plain ]; then set_ bouncer primary
      else set_ bouncer alt; fi
    fi ;;
  "input keyevent KEYCODE_"[0-9])
    if [ "$(get bouncer)" = primary ]; then
      set_ typed "$(get typed)${cmd: -1}"
      if [ "${FAKE_AUTOCONFIRM:-1}" = 1 ] && [ "$(get typed)" = "$FAKE_PIN" ]; then unlock; fi
    fi ;;
  "input keyevent KEYCODE_ENTER")
    if [ "$(get bouncer)" = primary ] && [ "$(get typed)" = "$FAKE_PIN" ]; then unlock; fi ;;
esac
exit 0
FAKE
chmod +x "$TMP/bin/adb" "$TMP/bin/sleep"

fails=0
declare -a ASSERT_ERRS
count() { grep -cE "$1" "$FAKE_DIR/calls.log" || true; }
check() { # check <desc> <command...>: records a failure if the command fails
  local desc=$1; shift
  "$@" || ASSERT_ERRS+=("$desc")
}
n_is() { [ "$(count "$1")" -eq "$2" ]; }   # n_is <regex> <exact count>
n_ge() { [ "$(count "$1")" -ge "$2" ]; }   # n_ge <regex> <min count>
rc_ok() { [ "$RC" -eq 0 ]; }
rc_bad() { [ "$RC" -ne 0 ]; }
no_leak() { ! grep -q "$TEST_PIN" "$FAKE_DIR/out.log"; }
has_call() { grep -q -- "$1" "$FAKE_DIR/calls.log"; }

run_scenario() { # run_scenario <name> <locked> <keyguard> <mode> <autoconfirm>
  local name=$1
  export FAKE_DIR="$TMP/$name" FAKE_PIN=$TEST_PIN FAKE_MODE=$4 FAKE_AUTOCONFIRM=$5
  mkdir -p "$FAKE_DIR"; : > "$FAKE_DIR/calls.log"
  printf '%s' "$2" > "$FAKE_DIR/locked"; printf '%s' "$3" > "$FAKE_DIR/keyguard"
  printf '%s' plain > "$FAKE_DIR/bouncer"; : > "$FAKE_DIR/typed"
  ASSERT_ERRS=()
  PATH="$TMP/bin:$PATH" ADB_PIN=$TEST_PIN E2E_DEVICE=fake:1 OUT_DIR='' \
    bash "$SCRIPT" prep > "$FAKE_DIR/out.log" 2>&1
  RC=$?
  check "PIN leaked to output" no_leak
}

finish() {
  if [ ${#ASSERT_ERRS[@]} -eq 0 ]; then echo "PASS: $1"
  else
    echo "FAIL: $1"; printf '  - %s\n' "${ASSERT_ERRS[@]}"
    echo "  calls:"; sed 's/^/    /' "$FAKE_DIR/calls.log" | tail -40
    fails=$((fails+1))
  fi
}

# a) locked + untrusted, swipe raises primary bouncer, auto-confirm
run_scenario a 1 1 primary 1
check "exit 0 (got $RC)" rc_ok
check "no wm dismiss-keyguard" n_is 'dismiss-keyguard' 0
check "no KEYCODE_ENTER" n_is 'KEYCODE_ENTER' 0
check "digits sent exactly once" n_is 'KEYCODE_[0-9]$' ${#TEST_PIN}
check "one swipe" n_is 'input swipe' 1
check "swipe geometry from wm size" has_call "input swipe 504 1952 504 493 600"
finish "a: locked, swipe -> primary bouncer, auto-confirm"

# b) locked, primary bouncer never shows
run_scenario b 1 1 never_primary 1
check "exit non-zero" rc_bad
check "no digit keyevent ever" n_is 'KEYCODE_[0-9]$' 0
check "BACK sent" n_ge 'KEYCODE_BACK' 1
check "3 attempts (3 swipes)" n_is 'input swipe' 3
check "no wm dismiss-keyguard while locked" n_is 'dismiss-keyguard' 0
finish "b: primary bouncer never shows -> no digits, fails after 3 attempts"

# c) trusted (deviceLocked=0) with keyguard showing
run_scenario c 0 1 primary 1
check "exit 0 (got $RC)" rc_ok
check "wm dismiss-keyguard used" n_ge 'dismiss-keyguard' 1
check "no digits" n_is 'KEYCODE_[0-9]$' 0
check "no swipe" n_is 'input swipe' 0
finish "c: trusted + keyguard showing -> dismiss-keyguard, no PIN"

# d) locked, no auto-confirm
run_scenario d 1 1 primary 0
check "exit 0 (got $RC)" rc_ok
check "ENTER sent once" n_is 'KEYCODE_ENTER' 1
check "digits sent exactly once" n_is 'KEYCODE_[0-9]$' ${#TEST_PIN}
check "no wm dismiss-keyguard" n_is 'dismiss-keyguard' 0
finish "d: locked, no auto-confirm -> ENTER once"

if [ "$fails" -eq 0 ]; then echo "ALL PASS"; else echo "$fails scenario(s) FAILED"; exit 1; fi
