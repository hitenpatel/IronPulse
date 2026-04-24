/**
 * Shared achievement catalog. The server's `checkAndUnlock` helper is the
 * source of truth for *when* a badge unlocks; this module is the source of
 * truth for how it presents (label, copy, emoji). Consumed by both the web
 * and mobile achievements screens.
 */

export interface AchievementBadge {
  /** Matches Achievement.type in the database. */
  type: string;
  /** Display name. */
  label: string;
  /** One-line unlock criterion, shown on locked cards. */
  description: string;
  /** Single emoji used as the badge glyph. */
  emoji: string;
}

export const ACHIEVEMENT_CATALOG: AchievementBadge[] = [
  {
    type: "first_workout",
    label: "First Rep",
    description: "Complete your first workout.",
    emoji: "🏋️",
  },
  {
    type: "streak_7",
    label: "Week Warrior",
    description: "Work out on 7 consecutive days.",
    emoji: "🔥",
  },
  {
    type: "streak_30",
    label: "Iron Streak",
    description: "Work out on 30 consecutive days.",
    emoji: "⚡",
  },
  {
    type: "pr_count_10",
    label: "PR Machine",
    description: "Set 10 personal records.",
    emoji: "🏆",
  },
  {
    type: "workouts_50",
    label: "Half Century",
    description: "Complete 50 workouts.",
    emoji: "💪",
  },
  {
    type: "workouts_100",
    label: "Centurion",
    description: "Complete 100 workouts.",
    emoji: "🥇",
  },
];
