export { appRouter, type AppRouter } from "./root";
export { createTRPCContext, createCallerFactory } from "./trpc";
export type { CreateContextOptions } from "./trpc";
export { getPowerSyncJWKS } from "./lib/powersync-auth";
export {
  sendWeeklySummaryForUser,
  gatherWeeklySummary,
  formatWeeklySummaryText,
  formatWeeklySummaryPushBody,
  type WeeklySummaryData,
} from "./lib/weekly-summary";
export {
  createNotification,
  notifyNewPR,
  notifyNewMessage,
  notifyNewFollower,
  notifyReaction,
  notifyGoalComplete,
  notifyCoachActivity,
} from "./lib/notifications";
export {
  findStreakAtRiskUsers,
  findInactiveUsers,
  sendRetentionNudge,
  type RetentionUser,
} from "./lib/retention";
export {
  findExpiringChallengeMembers,
  sendChallengeExpiryReminder,
  type ChallengeExpiryCandidate,
} from "./lib/challenge-expiry";
export {
  deliverPendingNotifications,
  MAX_ATTEMPTS as OUTBOX_MAX_ATTEMPTS,
  type DeliverOptions,
  type DeliveryBatchResult,
} from "./lib/notification-outbox";
