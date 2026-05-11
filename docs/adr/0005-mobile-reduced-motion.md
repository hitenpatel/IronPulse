# 0005. Respect prefers-reduced-motion on mobile

- **Status:** Accepted
- **Date:** 2026-05-11
- **Deciders:** @hiten

## Context

The mobile app shipped several signature animations (rest-timer breathing
glow, FAB scale spring, sliding tab pill, tab icon pop, streak flame
pulse, skeleton shimmer, PR confetti) that ran unconditionally. Users
with the OS-level *Reduce Motion* preference enabled — common on iOS for
vestibular sensitivity, and on Android for the same reason — were still
seeing every loop. WCAG 2.1 SC 2.3.3 (Animation from Interactions) and
2.2.2 (Pause, Stop, Hide) expect us to respect that signal.

## Decision

Centralise the OS preference behind a single hook, `useReducedMotion()`,
backed by a module-level store driven by
`AccessibilityInfo.isReduceMotionEnabled()` and
`AccessibilityInfo.addEventListener("reduceMotionChanged", …)`. Consumers
of animations call the hook and branch:

- For Reanimated loops: skip `withRepeat` / `withSpring` / `withTiming`
  entirely and assign the shared value directly to its final/resting state.
- For one-shot decorative animations (confetti, scale springs on press):
  skip the effect or assign the end value synchronously.
- For animations tied to information (countdown progress, swipe-to-delete
  reveal): keep them — the motion conveys meaning, not decoration.

The hook is implemented with `useSyncExternalStore` so it works in
concurrent React without tearing, and the store layer is pure JS so it
can be unit-tested without a renderer.

## Consequences

### Good

- Single source of truth for reduce-motion across the app.
- Pure store is unit-testable; coverage in
  `apps/mobile/lib/__tests__/reduced-motion.test.ts`.
- Reanimated worklets remain on the UI thread — guard happens in JS
  before the worklet is scheduled, so there's no perf cost in the
  reduced-motion path.

### Bad

- Every new animation must opt into the pattern. Easy to forget.
- The "decorative vs informational" judgement is per-animation; reviewers
  need to look for the hook in PRs that introduce motion.

### Neutral

- Confetti is library-driven (`react-native-confetti-cannon`); we gate
  it by simply not rendering the `<ConfettiCannon>` when reduce-motion
  is on rather than trying to configure the library.

## Pattern

```tsx
import { useReducedMotion } from "@/lib/reduced-motion";

export function MyAnimatedThing() {
  const reducedMotion = useReducedMotion();
  const value = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) {
      value.value = 1; // snap to end state
      return;
    }
    value.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [reducedMotion, value]);

  // …
}
```

For one-shot effects (confetti, press-down spring) gate the side effect:

```tsx
{hasPR && !reducedMotion && <ConfettiCannon … />}
```

## Alternatives considered

- **Global Reanimated config toggle.** Reanimated has no first-class
  "disable everything" switch, and a brute-force toggle would also kill
  informational animations (progress rings, gesture follow).
- **Per-component prop.** Threading a `reducedMotion` prop through every
  animated component is noisy and easy to drop. A hook reads from a
  shared store and stays local to the animation owner.

## Follow-ups

- #321 — the ticket that drove this change.
- Future motion-heavy features (e.g. workout celebrations,
  rest-timer redesign) must call `useReducedMotion` and branch.
