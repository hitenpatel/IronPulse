import { sendPushNotification } from "./push";
import { captureError } from "./capture-error";
import type { AchievementBadge } from "@ironpulse/shared";

// Intentionally loose: callers pass the PrismaClient but tests pass a partial mock.
// We use `any` here because Prisma's generated types are nominal and don't structurally
// match lightweight mocks from test files.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

type NotificationKind =
  | "follow"
  | "reaction"
  | "message"
  | "pr"
  | "workout_complete"
  | "goal_complete"
  | "achievement"
  | "coach_activity";

/**
 * Persist an in-app notification AND fire a push notification to all of
 * the user's registered devices. Safe to call in fire-and-forget style —
 * any failure is captured via Sentry, never thrown.
 */
export async function createNotification(
  db: Db,
  params: {
    userId: string;
    type: NotificationKind;
    title: string;
    body?: string;
    linkPath?: string;
    data?: Record<string, unknown>;
  },
) {
  // Persist in-app notification (skipped if caller's db mock doesn't expose it)
  if (db.notification) {
    try {
      await db.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body ?? null,
          linkPath: params.linkPath ?? null,
          data: params.data ?? undefined,
        } as never,
      });
    } catch (err) {
      captureError(err, { context: "createNotification.insert", ...params });
    }
  }

  // Fire push to registered devices. Tokens flagged as dead by Expo
  // (DeviceNotRegistered / InvalidCredentials) are deleted so we stop paying
  // delivery fees and noisy failures on them.
  try {
    const tokens = await db.pushToken.findMany({
      where: { userId: params.userId },
      select: { token: true },
    });
    for (const t of tokens) {
      try {
        const result = await sendPushNotification(
          t.token,
          params.title,
          params.body ?? "",
          params.data,
        );
        if (result.deadToken) {
          await db.pushToken
            .deleteMany({ where: { token: t.token } })
            .catch((err: unknown) =>
              captureError(err, {
                context: "createNotification.prune",
                ...params,
              }),
            );
        } else if (!result.delivered && result.error) {
          captureError(new Error(result.error), {
            context: "createNotification.delivery",
            ...params,
          });
        }
      } catch (err) {
        captureError(err, { context: "createNotification.push", ...params });
      }
    }
  } catch (err) {
    captureError(err, { context: "createNotification.tokens", ...params });
  }
}

export async function notifyNewPR(
  db: Db,
  userId: string,
  exerciseName: string,
  value: string,
) {
  await createNotification(db, {
    userId,
    type: "pr",
    title: "New PR!",
    body: `${exerciseName} — ${value}`,
    linkPath: `/stats`,
  });
}

export async function notifyNewMessage(
  db: Db,
  receiverId: string,
  senderName: string,
  senderId?: string,
) {
  await createNotification(db, {
    userId: receiverId,
    type: "message",
    title: "New Message",
    body: `From ${senderName}`,
    ...(senderId && { linkPath: `/messages/${senderId}` }),
  });
}

export async function notifyNewFollower(
  db: Db,
  userId: string,
  followerName: string,
  followerId: string,
) {
  await createNotification(db, {
    userId,
    type: "follow",
    title: "New follower",
    body: `${followerName} started following you`,
    linkPath: `/users/${followerId}`,
  });
}

export async function notifyReaction(
  db: Db,
  userId: string,
  reactorName: string,
  reactionType: string,
  postId: string,
) {
  await createNotification(db, {
    userId,
    type: "reaction",
    title: `${reactorName} reacted to your workout`,
    body: reactionType,
    linkPath: `/feed?post=${postId}`,
  });
}

export async function notifyGoalComplete(
  db: Db,
  userId: string,
  goalTitle: string,
) {
  await createNotification(db, {
    userId,
    type: "goal_complete",
    title: "Goal achieved! 🎉",
    body: goalTitle,
    linkPath: `/goals`,
  });
}

export async function notifyAchievement(
  db: Db,
  userId: string,
  badge: AchievementBadge,
) {
  await createNotification(db, {
    userId,
    type: "achievement",
    title: `${badge.emoji} ${badge.label}`,
    body: badge.description,
    linkPath: `/achievements`,
    data: { achievementType: badge.type },
  });
}

export async function notifyCoachActivity(
  db: Db,
  coachId: string,
  athleteName: string,
  activity: string,
  athleteId: string,
) {
  await createNotification(db, {
    userId: coachId,
    type: "coach_activity",
    title: `${athleteName}: ${activity}`,
    linkPath: `/coach/clients/${athleteId}`,
  });
}
