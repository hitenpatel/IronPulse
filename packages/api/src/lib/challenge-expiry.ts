import { createNotification } from "./notifications";
import { captureError } from "./capture-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = any;

export interface ChallengeExpiryCandidate {
  userId: string;
  userEmail: string;
  userName: string | null;
  challengeId: string;
  challengeName: string;
  challengeEndsAt: Date;
  rank: number;
  participantCount: number;
}

/**
 * Find all active challenge participants who should receive a 3-day expiry
 * reminder: the challenge ends within 2–4 days from now, the user has opted
 * in to email notifications, and they haven't been sent a challenge_expiry
 * notification in the last 24 hours.
 */
export async function findExpiringChallengeMembers(
  db: Db,
): Promise<ChallengeExpiryCandidate[]> {
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const fourDaysFromNow = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const challenges = await db.challenge.findMany({
    where: {
      endsAt: {
        gte: twoDaysFromNow,
        lt: fourDaysFromNow,
      },
    },
    include: {
      participants: {
        orderBy: { progress: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              weeklySummaryEnabled: true,
              deletionRequestedAt: true,
            },
          },
        },
      },
    },
  });

  const results: ChallengeExpiryCandidate[] = [];

  for (const challenge of challenges) {
    const participantCount = challenge.participants.length;

    for (let i = 0; i < challenge.participants.length; i++) {
      const participant = challenge.participants[i];
      const user = participant.user;

      if (user.deletionRequestedAt || !user.weeklySummaryEnabled) continue;

      // Idempotency: skip if we already sent a challenge_expiry nudge in the
      // last 24 hours (covers duplicate cron runs and multiple challenges).
      const recent = await db.notification.findFirst({
        where: {
          userId: user.id,
          type: "challenge_expiry",
          createdAt: { gte: oneDayAgo },
        },
        select: { id: true },
      });
      if (recent) continue;

      results.push({
        userId: user.id,
        userEmail: user.email,
        userName: user.name,
        challengeId: challenge.id,
        challengeName: challenge.name,
        challengeEndsAt: challenge.endsAt,
        rank: i + 1,
        participantCount,
      });
    }
  }

  return results;
}

/**
 * Create an in-app + push notification for one challenge member and
 * optionally send an email. Email failures do not block notification
 * delivery — the Notification row already serves as the 24 h dedup marker.
 */
export async function sendChallengeExpiryReminder(
  db: Db,
  candidate: ChallengeExpiryCandidate,
  opts: {
    resendSend?: (args: { to: string; subject: string; text: string }) => Promise<void>;
  } = {},
): Promise<{ delivered: boolean; emailSent: boolean }> {
  const deadline = candidate.challengeEndsAt.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const rankStr = `${candidate.rank}${getRankSuffix(candidate.rank)}`;
  const challengeUrl = `https://ironpulse.app/challenges/${candidate.challengeId}`;

  try {
    await createNotification(db, {
      userId: candidate.userId,
      type: "challenge_expiry",
      title: `Challenge ending soon: ${candidate.challengeName}`,
      body: `You're ranked #${candidate.rank} of ${candidate.participantCount}. Deadline: ${deadline}.`,
      linkPath: `/challenges/${candidate.challengeId}`,
      data: { challengeId: candidate.challengeId },
    });
  } catch (err) {
    captureError(err, {
      context: "challengeExpiry.notification",
      userId: candidate.userId,
      challengeId: candidate.challengeId,
    });
    return { delivered: false, emailSent: false };
  }

  if (opts.resendSend && candidate.userEmail) {
    const firstName = candidate.userName?.split(" ")[0];
    const greeting = firstName ? `Hey ${firstName},` : "Hey,";

    const text = [
      greeting,
      "",
      `The "${candidate.challengeName}" challenge closes on ${deadline} — just 3 days away.`,
      "",
      `You're currently ranked ${rankStr} out of ${candidate.participantCount} participants. Push now to move up the leaderboard.`,
      "",
      `View your standing and log your progress: ${challengeUrl}`,
      "",
      "— IronPulse",
    ].join("\n");

    try {
      await opts.resendSend({
        to: candidate.userEmail,
        subject: `3 days left: "${candidate.challengeName}"`,
        text,
      });
      return { delivered: true, emailSent: true };
    } catch (err) {
      captureError(err, {
        context: "challengeExpiry.email",
        userId: candidate.userId,
        challengeId: candidate.challengeId,
      });
    }
  }

  return { delivered: true, emailSent: false };
}

function getRankSuffix(rank: number): string {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  const mod10 = rank % 10;
  if (mod10 === 1) return "st";
  if (mod10 === 2) return "nd";
  if (mod10 === 3) return "rd";
  return "th";
}
