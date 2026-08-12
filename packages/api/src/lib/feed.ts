import type { PrismaClient } from "@zor/db";

export async function createFeedItem(
  db: PrismaClient,
  userId: string,
  type: string,
  referenceId: string,
  visibility = "followers",
) {
  return db.activityFeedItem.upsert({
    where: { userId_type_referenceId: { userId, type, referenceId } },
    create: { userId, type, referenceId, visibility },
    update: { visibility },
  });
}
