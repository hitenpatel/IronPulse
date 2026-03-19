-- AlterTable: add deletion_requested_at if it doesn't exist (migration 001 may have been skipped)
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletion_requested_at" TIMESTAMP(3);
