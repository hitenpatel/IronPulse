import { sendPushNotification } from "./push";
import { captureError } from "./capture-error";

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
    ).catch((err) =>
      captureError(err, { context: "notifyNewPR", userId, exerciseName })
    );
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
    ).catch((err) =>
      captureError(err, { context: "notifyNewMessage", receiverId, senderName })
    );
  }
}
