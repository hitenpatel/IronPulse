import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

let cached = false;
let initialized = false;
const subscribers = new Set<() => void>();

function notifyAll() {
  for (const fn of subscribers) fn();
}

function setValue(next: boolean) {
  if (cached === next) return;
  cached = next;
  notifyAll();
}

function initOnce() {
  if (initialized) return;
  initialized = true;
  AccessibilityInfo.addEventListener("reduceMotionChanged", setValue);
  AccessibilityInfo.isReduceMotionEnabled()
    .then(setValue)
    .catch(() => setValue(false));
}

export function subscribeReducedMotion(cb: () => void): () => void {
  initOnce();
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

export function getReducedMotionSnapshot(): boolean {
  return cached;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionSnapshot,
  );
}

// Test-only seam.
export function __resetReducedMotionForTests() {
  cached = false;
  initialized = false;
  subscribers.clear();
}
