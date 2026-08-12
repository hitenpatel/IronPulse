-- Add dedupe_key to notifications
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" TEXT;

-- CreateIndex: unique dedupe_key on notifications
CREATE UNIQUE INDEX "notifications_dedupe_key_key" ON "notifications"("dedupe_key");

-- Deduplicate personal_records before adding unique constraint on (set_id, type)
DELETE FROM personal_records AS target
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY set_id, type
             ORDER BY created_at ASC, id ASC
           ) AS duplicate_rank
    FROM personal_records
    WHERE set_id IS NOT NULL
  ) AS ranked
  WHERE duplicate_rank > 1
) AS duplicates
WHERE target.id = duplicates.id;

-- CreateIndex: unique (set_id, type) on personal_records
CREATE UNIQUE INDEX "personal_records_set_id_type_key" ON "personal_records"("set_id", "type");

-- Deduplicate activity_feed_items before adding unique constraint on (user_id, type, reference_id)
DELETE FROM activity_feed_items AS target
USING (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, type, reference_id
             ORDER BY created_at ASC, id ASC
           ) AS duplicate_rank
    FROM activity_feed_items
  ) AS ranked
  WHERE duplicate_rank > 1
) AS duplicates
WHERE target.id = duplicates.id;

-- CreateIndex: unique (user_id, type, reference_id) on activity_feed_items
CREATE UNIQUE INDEX "activity_feed_items_user_id_type_reference_id_key" ON "activity_feed_items"("user_id", "type", "reference_id");

-- CreateTable: workout_finalizations
CREATE TABLE "workout_finalizations" (
    "workout_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL,
    "duration_seconds" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_at" TIMESTAMP(3),
    "lock_token" UUID,
    "processed_at" TIMESTAMP(3),
    "result" JSONB,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workout_finalizations_pkey" PRIMARY KEY ("workout_id")
);

-- CreateIndex: polling index on workout_finalizations
CREATE INDEX "workout_finalizations_status_available_at_locked_at_idx" ON "workout_finalizations"("status", "available_at", "locked_at");

-- AddForeignKey: workout_finalizations → workouts
ALTER TABLE "workout_finalizations" ADD CONSTRAINT "workout_finalizations_workout_id_fkey" FOREIGN KEY ("workout_id") REFERENCES "workouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: workout_finalizations → users
ALTER TABLE "workout_finalizations" ADD CONSTRAINT "workout_finalizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: notification_outbox
CREATE TABLE "notification_outbox" (
    "id" UUID NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link_path" TEXT,
    "data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_at" TIMESTAMP(3),
    "lock_token" UUID,
    "sent_at" TIMESTAMP(3),
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique dedupe_key on notification_outbox
CREATE UNIQUE INDEX "notification_outbox_dedupe_key_key" ON "notification_outbox"("dedupe_key");

-- CreateIndex: polling index on notification_outbox
CREATE INDEX "notification_outbox_status_available_at_locked_at_idx" ON "notification_outbox"("status", "available_at", "locked_at");

-- AddForeignKey: notification_outbox → users
ALTER TABLE "notification_outbox" ADD CONSTRAINT "notification_outbox_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
