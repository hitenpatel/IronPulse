import { describe, it, expect, vi, beforeEach } from "vitest";

const listeners: Record<string, ((value: boolean) => void)[]> = {};
const mockIsReduceMotionEnabled = vi.fn();

vi.mock("react-native", () => ({
  AccessibilityInfo: {
    isReduceMotionEnabled: () => mockIsReduceMotionEnabled(),
    addEventListener: (event: string, handler: (value: boolean) => void) => {
      (listeners[event] ??= []).push(handler);
      return { remove: vi.fn() };
    },
  },
}));

function emit(event: string, value: boolean) {
  for (const fn of listeners[event] ?? []) fn(value);
}

beforeEach(async () => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  mockIsReduceMotionEnabled.mockReset();
  const mod = await import("../reduced-motion");
  mod.__resetReducedMotionForTests();
});

describe("reduced-motion store", () => {
  it("starts with snapshot=false before any subscription", async () => {
    const { getReducedMotionSnapshot } = await import("../reduced-motion");
    expect(getReducedMotionSnapshot()).toBe(false);
  });

  it("attaches the AccessibilityInfo listener on first subscribe", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);
    const { subscribeReducedMotion } = await import("../reduced-motion");
    expect(listeners["reduceMotionChanged"]).toBeUndefined();
    const unsubscribe = subscribeReducedMotion(() => {});
    expect(listeners["reduceMotionChanged"]).toHaveLength(1);
    unsubscribe();
  });

  it("reads the initial value from AccessibilityInfo and notifies subscribers", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);
    const { subscribeReducedMotion, getReducedMotionSnapshot } = await import("../reduced-motion");
    const onChange = vi.fn();
    subscribeReducedMotion(onChange);
    await new Promise((r) => setImmediate(r));
    expect(getReducedMotionSnapshot()).toBe(true);
    expect(onChange).toHaveBeenCalled();
  });

  it("falls back to false when AccessibilityInfo rejects", async () => {
    mockIsReduceMotionEnabled.mockRejectedValue(new Error("boom"));
    const { subscribeReducedMotion, getReducedMotionSnapshot } = await import("../reduced-motion");
    subscribeReducedMotion(() => {});
    await new Promise((r) => setImmediate(r));
    expect(getReducedMotionSnapshot()).toBe(false);
  });

  it("propagates OS-level reduceMotionChanged events to all subscribers", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);
    const { subscribeReducedMotion, getReducedMotionSnapshot } = await import("../reduced-motion");
    const a = vi.fn();
    const b = vi.fn();
    subscribeReducedMotion(a);
    subscribeReducedMotion(b);
    await new Promise((r) => setImmediate(r));
    a.mockClear();
    b.mockClear();
    emit("reduceMotionChanged", true);
    expect(getReducedMotionSnapshot()).toBe(true);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("does not re-notify when the new value equals the cached value", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(true);
    const { subscribeReducedMotion } = await import("../reduced-motion");
    const cb = vi.fn();
    subscribeReducedMotion(cb);
    await new Promise((r) => setImmediate(r));
    cb.mockClear();
    emit("reduceMotionChanged", true);
    expect(cb).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", async () => {
    mockIsReduceMotionEnabled.mockResolvedValue(false);
    const { subscribeReducedMotion } = await import("../reduced-motion");
    const cb = vi.fn();
    const unsubscribe = subscribeReducedMotion(cb);
    await new Promise((r) => setImmediate(r));
    cb.mockClear();
    unsubscribe();
    emit("reduceMotionChanged", true);
    expect(cb).not.toHaveBeenCalled();
  });
});
