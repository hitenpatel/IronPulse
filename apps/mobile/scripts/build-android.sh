#!/usr/bin/env bash
# build-android.sh — run gradle with memory + priority limits so the kernel
# OOM-killer doesn't take down other processes (Claude Code, editors, etc.)
# during Android builds.
#
# Usage:   apps/mobile/scripts/build-android.sh [gradle-task]
# Default task: assembleRelease
#
# Why this matters: a plain `./gradlew assembleRelease` on this project can
# consume 6+ GB RSS during kotlin compilation. On a 16GB machine that is
# enough for the kernel to pick a neighbour process to kill when memory is
# tight — historically taking down the claude-tmux service and on one
# occasion triggering a full system reboot.

set -euo pipefail

TASK="${1:-assembleRelease}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ANDROID_DIR="$SCRIPT_DIR/../android"

if [ ! -x "$ANDROID_DIR/gradlew" ]; then
  echo "[build-android] $ANDROID_DIR/gradlew not found — run 'expo prebuild --platform android' first" >&2
  exit 1
fi

# Toolchain. Gradle 8.14.3 cannot parse class file major version 69, so a host
# whose default `java` is 25 fails in "semantic analysis" before any task runs.
# The SDK path is not discoverable by gradle either — android/local.properties
# is regenerated (and lost) by `expo prebuild --clean`, so pin it here instead.
if [ -z "${JAVA_HOME:-}" ] || ! "${JAVA_HOME}/bin/java" -version 2>&1 | grep -q '"21'; then
  for CANDIDATE in /usr/lib/jvm/java-21-openjdk-* /usr/lib/jvm/temurin-21-*; do
    [ -x "$CANDIDATE/bin/java" ] && { JAVA_HOME="$CANDIDATE"; break; }
  done
fi
[ -n "${JAVA_HOME:-}" ] || { echo "[build-android] no JDK 21 found — set JAVA_HOME" >&2; exit 1; }
export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"

if [ -z "${ANDROID_HOME:-}" ]; then
  for CANDIDATE in "$HOME/android-sdk" "$HOME/Android/Sdk" /opt/android-sdk /usr/lib/android-sdk; do
    [ -d "$CANDIDATE/platform-tools" ] && { ANDROID_HOME="$CANDIDATE"; break; }
  done
fi
[ -n "${ANDROID_HOME:-}" ] || { echo "[build-android] no Android SDK found — set ANDROID_HOME" >&2; exit 1; }
export ANDROID_HOME
export ANDROID_SDK_ROOT="$ANDROID_HOME"

echo "[build-android] JAVA_HOME=$JAVA_HOME ANDROID_HOME=$ANDROID_HOME"

# Native toolchain sanity. Google ships the NDK and build-tools as x86_64-only
# binaries; on this arm64 host they run through qemu binfmt, which needs an
# x86_64 sysroot for the dynamic loader. Without QEMU_LD_PREFIX clang dies with
# "libpthread.so.0: cannot open shared object file".
if [ -d /usr/x86_64-linux-gnu/lib ]; then
  export QEMU_LD_PREFIX=/usr/x86_64-linux-gnu
fi

# The RN gradle plugin resolves hermesc per-OS but only knows linux-amd64
# ("OS not recognized" on an aarch64 JVM). Expo's generated app/build.gradle
# sets react.hermesCommand with a %OS-BIN% placeholder, and PathUtils.kt uses
# that *before* any env override — so the only working fix is to patch the
# generated file, pinning linux64-bin (its hermesc is statically linked
# x86_64 and runs fine under qemu). Idempotent; reapplied every build since
# `expo prebuild --clean` regenerates the file.
APP_GRADLE="$ANDROID_DIR/app/build.gradle"
if grep -q 'hermesc/%OS-BIN%/hermesc' "$APP_GRADLE"; then
  sed -i 's#/sdks/hermesc/%OS-BIN%/hermesc#/sdks/hermesc/linux64-bin/hermesc#' "$APP_GRADLE"
  echo "[build-android] patched hermesCommand in app/build.gradle (linux64-bin under qemu)"
fi

# An NDK missing meta/platforms.json makes AGP silently fall back to
# ANDROID_PLATFORM=android-22, which then fails prefab checks with the
# misleading "User has minSdkVersion 22 but library was built for 24".
# Refuse to build with a broken NDK rather than chase that ghost again.
for NDK_DIR in "$ANDROID_HOME"/ndk/*/; do
  case "$NDK_DIR" in *.broken/) continue ;; esac
  if [ ! -f "$NDK_DIR/meta/platforms.json" ]; then
    echo "[build-android] NDK at $NDK_DIR is incomplete (no meta/platforms.json) — reinstall it" >&2
    exit 1
  fi
done

# Restrict native builds to the ABI we actually run on (Pixel = arm64-v8a).
# Emulated x86_64 NDK builds of the other three ABIs add hours for nothing.
# Override with REACT_NATIVE_ARCHS for a store build that needs all ABIs.
ARCHS="${REACT_NATIVE_ARCHS:-arm64-v8a}"

# qemu's x86_64 emulation segfaults running the SDK's bundled x86_64 ninja on
# real dependency trees, so arm64-native cmake/ninja are symlinked into
# $ANDROID_HOME/cmake/*/bin (originals kept as *.x86_64). Verify the swap is
# still in place — a fresh `sdkmanager --install cmake` would undo it.
for CM in "$ANDROID_HOME"/cmake/*/bin; do
  if file -L "$CM/ninja" 2>/dev/null | grep -q x86-64; then
    echo "[build-android] $CM/ninja is x86_64 — re-link arm64 cmake/ninja from /opt/cmake-arm64/bin" >&2
    exit 1
  fi
done

# Signing: if apps/mobile/keystore/.env exists, materialise keystore.properties
# so gradle's signingConfigs.release block in build.gradle can sign release builds.
# If the .env is absent, gradle falls back to the debug keystore (set by the
# android-release-signing plugin) — fine for dev, not for store distribution.
KEYSTORE_ENV="$SCRIPT_DIR/../keystore/.env"
if [ -f "$KEYSTORE_ENV" ]; then
  set -a; . "$KEYSTORE_ENV"; set +a
  if [ -n "${ZOR_KEYSTORE_FILE:-}" ]; then
    cat > "$ANDROID_DIR/keystore.properties" <<EOF
storeFile=${ZOR_KEYSTORE_FILE}
storePassword=${ZOR_KEYSTORE_PASSWORD}
keyAlias=${ZOR_KEY_ALIAS}
keyPassword=${ZOR_KEY_PASSWORD}
EOF
    echo "[build-android] signing: release keystore = $ZOR_KEYSTORE_FILE"
  fi
else
  echo "[build-android] signing: no keystore/.env found — release will use debug key"
fi

# Memory ceiling. A per-process `ulimit -v` cannot work here: node 22 reserves
# multi-GB *virtual* ranges for WebAssembly (undici's llhttp) and dies with
# "Cannot allocate Wasm memory" under any practical VIRT cap, while the JVM's
# VIRT reservation dwarfs its RSS. What we actually need is an RSS cap on the
# whole build tree, so use a systemd user scope with MemoryMax: a runaway
# build gets OOM-killed *inside its own cgroup* instead of the kernel picking
# a neighbour (claude-tmux, editors) to kill.
MEM_MAX="${MEM_MAX:-10G}"

# CPU + I/O niceness — let the desktop + Claude stay responsive.
NICE_ADJ="${NICE_ADJ:-10}"
IO_CLASS="${IO_CLASS:-2}"  # 1=realtime, 2=best-effort (default), 3=idle
IO_PRIO="${IO_PRIO:-7}"    # within best-effort: 0=high, 7=low

SCOPE=()
if systemd-run --user --scope -p MemoryMax=100M -q -- true 2>/dev/null; then
  SCOPE=(systemd-run --user --scope -p "MemoryMax=$MEM_MAX" -q --)
else
  echo "[build-android] warning: systemd-run unavailable — no memory cap on this build" >&2
fi

echo "[build-android] task=$TASK mem_max=$MEM_MAX nice=$NICE_ADJ io=$IO_CLASS/$IO_PRIO"
echo "[build-android] system mem: $(free -h | awk '/^Mem:/ {print $3"/"$2" used"}')"

cd "$ANDROID_DIR"

# nice + ionice wrap gradle itself. --no-daemon ensures the JVM exits when
# the build finishes (no resident daemon consuming memory between builds).
# The android-gradle-memory expo plugin sets matching heap limits in
# gradle.properties after prebuild regenerates that file.
exec "${SCOPE[@]}" nice -n "$NICE_ADJ" ionice -c "$IO_CLASS" -n "$IO_PRIO" \
  ./gradlew "$TASK" --no-daemon \
    -PreactNativeArchitectures="$ARCHS" \
    -Pandroid.aapt2FromMavenOverride="$ANDROID_HOME/build-tools/36.0.0/aapt2"
