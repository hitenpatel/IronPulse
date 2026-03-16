import { sendPushNotification } from "./push";

export async function notifyNewPR(
  db: any,
  userId: string,
  exerciseName: string,
  value: string
) {
  const tokens = await db.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });
  for (const t of tokens) {
    await sendPushNotification(
      t.token,
      "New PR!",
      `${exerciseName} — ${value}`
    ).catch(() => {});
  }
}

export async function notifyNewMessage(
  db: any,
  receiverId: string,
  senderName: string
) {
  const tokens = await db.pushToken.findMany({
    where: { userId: receiverId },
    select: { token: true },
  });
  for (const t of tokens) {
    await sendPushNotification(
      t.token,
      "New Message",
      `From ${senderName}`
    ).catch(() => {});
  }
}
