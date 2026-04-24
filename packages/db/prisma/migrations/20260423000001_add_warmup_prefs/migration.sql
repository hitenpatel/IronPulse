ALTER TABLE "users" ADD COLUMN "warmup_scheme" TEXT NOT NULL DEFAULT 'strength';
ALTER TABLE "users" ADD COLUMN "warmup_enabled" BOOLEAN NOT NULL DEFAULT true;
