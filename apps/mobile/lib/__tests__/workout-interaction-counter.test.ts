import { describe, it, expect } from "vitest";
import { createInteractionCounter } from "../workout-interaction-counter";

describe("createInteractionCounter", () => {
  it("starts at zero for both taps and keystrokes", () => {
    const counter = createInteractionCounter();
    expect(counter.count()).toBe(0);
    expect(counter.keystrokeCount()).toBe(0);
  });

  it("counts recordTap() calls", () => {
    const counter = createInteractionCounter();
    counter.recordTap();
    counter.recordTap();
    counter.recordTap();
    expect(counter.count()).toBe(3);
  });

  it("excludes recordKeystroke() calls from count() entirely", () => {
    const counter = createInteractionCounter();
    counter.recordTap();
    counter.recordTap();
    counter.recordKeystroke();
    counter.recordKeystroke();
    counter.recordKeystroke();
    counter.recordKeystroke();
    counter.recordKeystroke();

    // Taps counted, keystrokes visible only via the separate accessor —
    // never inflate count().
    expect(counter.count()).toBe(2);
    expect(counter.keystrokeCount()).toBe(5);
  });

  it("a session of only keystrokes (no taps) yields a tap count of zero", () => {
    const counter = createInteractionCounter();
    for (let i = 0; i < 20; i++) counter.recordKeystroke();
    expect(counter.count()).toBe(0);
  });

  it("reset() zeroes both counters", () => {
    const counter = createInteractionCounter();
    counter.recordTap();
    counter.recordTap();
    counter.recordKeystroke();
    counter.reset();
    expect(counter.count()).toBe(0);
    expect(counter.keystrokeCount()).toBe(0);
  });

  it("counts taps accumulated after a reset independently of the prior period", () => {
    const counter = createInteractionCounter();
    counter.recordTap();
    counter.recordTap();
    counter.reset();
    counter.recordTap();
    expect(counter.count()).toBe(1);
  });

  it("returns independent counters across separate createInteractionCounter() instances", () => {
    const a = createInteractionCounter();
    const b = createInteractionCounter();
    a.recordTap();
    a.recordTap();
    expect(a.count()).toBe(2);
    expect(b.count()).toBe(0);
  });
});
