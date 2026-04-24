import { Text, TextInput } from "react-native";

/**
 * Apply iOS Dynamic Type / Android font-scale support with a sensible cap.
 *
 * React Native's <Text> honours the OS font scale by default (via
 * `allowFontScaling`), but without an upper bound a user with
 * Accessibility → Larger Text can push body copy to ~3× size, which
 * breaks the acid-sport v2 layouts (tab bar bleed, exercise card
 * overlap, dashboard stat truncation).
 *
 * Capping at 1.3× is a pragmatic middle ground: users with "Larger Text"
 * or modest accessibility sizes get real scaling; "Maximum Accessibility
 * Size" stops before layouts collapse. TextInput gets the same cap so
 * label/placeholder stays aligned with body copy.
 *
 * The `defaultProps` API is officially deprecated as of React 18 but
 * still works on React Native 0.81.x — which is what this app ships on.
 * Migrating to a ScaledText wrapper is tracked separately and is a
 * codemod-scale change; this one-file fix gives Dynamic Type today
 * without touching every screen.
 */
export function configureTextDefaults(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Text as any).defaultProps = (Text as any).defaultProps ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Text as any).defaultProps.maxFontSizeMultiplier = 1.3;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (TextInput as any).defaultProps = (TextInput as any).defaultProps ?? {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (TextInput as any).defaultProps.maxFontSizeMultiplier = 1.3;
}
