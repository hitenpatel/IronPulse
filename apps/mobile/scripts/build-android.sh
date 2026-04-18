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

# Virtual memory ceiling. The JVM reserves a lot of VIRT up-front — set
# generously (8 GB) so we don't false-trigger on reservation, but low
# enough that a runaway build hits ENOMEM instead of triggering global OOM.
VMEM_KB="${VMEM_KB:-8388608}"  # 8 GB

# CPU + I/O niceness — let the desktop + Claude stay responsive.
NICE_ADJ="${NICE_ADJ:-10}"
IO_CLASS="${IO_CLASS:-2}"  # 1=realtime, 2=best-effort (default), 3=idle
IO_PRIO="${IO_PRIO:-7}"    # within best-effort: 0=high, 7=low

# Hard cap on per-process virtual address space.
ulimit -v "$VMEM_KB"

echo "[build-android] task=$TASK vmem_kb=$VMEM_KB nice=$NICE_ADJ io=$IO_CLASS/$IO_PRIO"
echo "[build-android] system mem: $(free -h | awk '/^Mem:/ {print $3"/"$2" used"}')"

cd "$ANDROID_DIR"

# nice + ionice wrap gradle itself. --no-daemon ensures the JVM exits when
# the build finishes (no resident daemon consuming memory between builds).
# The android-gradle-memory expo plugin sets matching heap limits in
# gradle.properties after prebuild regenerates that file.
exec nice -n "$NICE_ADJ" ionice -c "$IO_CLASS" -n "$IO_PRIO" \
  ./gradlew "$TASK" --no-daemon
