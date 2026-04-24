/**
 * Shared achievement catalog. The server's `checkAndUnlock` helper is the
 * source of truth for *when* a badge unlocks; this module is the source of
 * truth for how it presents (label, copy, emoji). Consumed by both the web
 * and mobile achievements screens.
 *
 * Adding a new badge: append it here with a stable `type` string, then add
 * the unlock rule in `packages/api/src/routers/achievement.ts`. Keep the
 * `type` names in sync — the join in the UI is purely by string equality.
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
  /** Broad grouping used to section the achievements screen. */
  category:
    | "getting_started"
    | "workouts"
    | "strength"
    | "cardio"
    | "social"
    | "recovery"
    | "goals";
}

export const ACHIEVEMENT_CATALOG: AchievementBadge[] = [
  // ── Getting started ────────────────────────────────────
  {
    type: "first_workout",
    label: "First Rep",
    description: "Complete your first workout.",
    emoji: "🏋️",
    category: "getting_started",
  },
  {
    type: "first_cardio",
    label: "On the Move",
    description: "Log your first cardio session.",
    emoji: "🏃",
    category: "getting_started",
  },
  {
    type: "first_follow",
    label: "Making Friends",
    description: "Follow another athlete.",
    emoji: "🤝",
    category: "social",
  },
  {
    type: "first_reaction",
    label: "Spreading Love",
    description: "React to someone else's workout.",
    emoji: "💌",
    category: "social",
  },

  // ── Workouts milestones ─────────────────────────────────
  {
    type: "workouts_10",
    label: "Ten Sets Deep",
    description: "Complete 10 workouts.",
    emoji: "🔟",
    category: "workouts",
  },
  {
    type: "workouts_50",
    label: "Half Century",
    description: "Complete 50 workouts.",
    emoji: "💪",
    category: "workouts",
  },
  {
    type: "workouts_100",
    label: "Centurion",
    description: "Complete 100 workouts.",
    emoji: "🥇",
    category: "workouts",
  },
  {
    type: "workouts_250",
    label: "Quarter Grand",
    description: "Complete 250 workouts.",
    emoji: "🏵️",
    category: "workouts",
  },
  {
    type: "workouts_500",
    label: "Iron Devotee",
    description: "Complete 500 workouts.",
    emoji: "🏛️",
    category: "workouts",
  },

  // ── Streak / consistency ────────────────────────────────
  {
    type: "streak_7",
    label: "Week Warrior",
    description: "Work out on 7 consecutive days.",
    emoji: "🔥",
    category: "workouts",
  },
  {
    type: "streak_30",
    label: "Iron Streak",
    description: "Work out on 30 consecutive days.",
    emoji: "⚡",
    category: "workouts",
  },
  {
    type: "streak_90",
    label: "Unstoppable",
    description: "Work out on 90 consecutive days.",
    emoji: "🌋",
    category: "workouts",
  },

  // ── Strength totals ─────────────────────────────────────
  {
    type: "pr_count_10",
    label: "PR Machine",
    description: "Set 10 personal records.",
    emoji: "🏆",
    category: "strength",
  },
  {
    type: "pr_count_25",
    label: "Record Hunter",
    description: "Set 25 personal records.",
    emoji: "🥈",
    category: "strength",
  },
  {
    type: "pr_count_50",
    label: "Legend",
    description: "Set 50 personal records.",
    emoji: "👑",
    category: "strength",
  },
  {
    type: "volume_10k_kg",
    label: "Heavy Hitter",
    description: "Lift 10,000 kg of total volume.",
    emoji: "🏋🏽‍♂️",
    category: "strength",
  },
  {
    type: "volume_100k_kg",
    label: "Volume King",
    description: "Lift 100,000 kg of total volume.",
    emoji: "🗻",
    category: "strength",
  },

  // ── Cardio totals ───────────────────────────────────────
  {
    type: "cardio_total_10km",
    label: "Ten K Club",
    description: "Cover 10 km of total cardio distance.",
    emoji: "🛣️",
    category: "cardio",
  },
  {
    type: "cardio_total_100km",
    label: "Hundred Horizon",
    description: "Cover 100 km of total cardio distance.",
    emoji: "🌄",
    category: "cardio",
  },
  {
    type: "cardio_marathon",
    label: "Marathoner",
    description: "Record a single cardio session of 42.2 km or more.",
    emoji: "🥾",
    category: "cardio",
  },

  // ── Recovery ────────────────────────────────────────────
  {
    type: "nutrition_streak_7",
    label: "Fuel Focused",
    description: "Log meals for 7 consecutive days.",
    emoji: "🥗",
    category: "recovery",
  },
  {
    type: "sleep_streak_7",
    label: "Well Rested",
    description: "Log sleep for 7 consecutive days.",
    emoji: "🌙",
    category: "recovery",
  },

  // ── Goals ───────────────────────────────────────────────
  {
    type: "first_goal_complete",
    label: "Goal Getter",
    description: "Complete your first goal.",
    emoji: "🎯",
    category: "goals",
  },
];

/** Type union of all valid badge type strings. */
export type AchievementType = (typeof ACHIEVEMENT_CATALOG)[number]["type"];
