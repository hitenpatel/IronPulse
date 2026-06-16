import type { PrismaClient } from "@mettlelift/db";

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
