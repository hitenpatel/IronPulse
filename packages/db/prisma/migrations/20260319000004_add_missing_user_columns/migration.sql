-- AlterTable: add missing columns to users that exist in schema but not DB
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "onboarding_complete" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fitness_goal" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "experience_level" TEXT;
