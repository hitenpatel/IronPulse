/**
 * Drop-in replacement for expo-haptics.
 * Tries react-native-haptic-feedback, falls back to no-op.
 */

export enum ImpactFeedbackStyle {
  Light = "Light",
  Medium = "Medium",
  Heavy = "Heavy",
}

export enum NotificationFeedbackType {
  Success = "Success",
  Warning = "Warning",
  Error = "Error",
}

function tryTrigger(type: string) {
  try {
    // Prefer an injected global `require` (tests) over Metro's runtime
    // require; a bare `require` reference is a ReferenceError under ESM
    // (Vitest) and cannot be intercepted by test stubs. Mirrors the same
    // pattern used in ./notifications.ts.
    const req =
      (globalThis as { require?: (id: string) => unknown }).require ??
      (typeof require === "function" ? require : null);
    if (!req) return;
    const HapticFeedback = (req("react-native-haptic-feedback") as { default?: { trigger?: (t: string) => void } }).default;
    HapticFeedback?.trigger?.(type);
  } catch {
    // Native module not available — no-op
  }
}

export async function impactAsync(style: ImpactFeedbackStyle = ImpactFeedbackStyle.Medium): Promise<void> {
  const map: Record<string, string> = { Light: "impactLight", Medium: "impactMedium", Heavy: "impactHeavy" };
  tryTrigger(map[style] || "impactMedium");
}

export async function notificationAsync(type: NotificationFeedbackType = NotificationFeedbackType.Success): Promise<void> {
  const map: Record<string, string> = { Success: "notificationSuccess", Warning: "notificationWarning", Error: "notificationError" };
  tryTrigger(map[type] || "notificationSuccess");
}

export async function selectionAsync(): Promise<void> {
  tryTrigger("selection");
}
