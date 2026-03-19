-- AlterTable
ALTER TABLE "workouts" ADD COLUMN "is_public" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "workouts" ADD COLUMN "share_token" TEXT;

-- Backfill share tokens for existing rows
UPDATE "workouts" SET "share_token" = gen_random_uuid()::text WHERE "share_token" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workouts_share_token_key" ON "workouts"("share_token");
