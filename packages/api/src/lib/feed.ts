import type { PrismaClient } from "@zor/db";

export async function createFeedItem(
  db: PrismaClient,
  userId: string,
  type: string,
  referenceId: string,
  visibility = "followers",
) {
  return db.activityFeedItem.create({
    data: { userId, type, referenceId, visibility },
  });
}
