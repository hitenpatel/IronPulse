-- CreateEnum
CREATE TYPE "WebhookEventStatus" AS ENUM ('pending', 'processing', 'succeeded', 'skipped_no_connection', 'dlq');

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" VARCHAR(16) NOT NULL,
    "external_id" VARCHAR(128) NOT NULL,
    "user_id" UUID,
    "payload" JSONB NOT NULL,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "WebhookEventStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMP(3),
    "processing_started_at" TIMESTAMP(3),
    "processing_owner" VARCHAR(64),
    "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_events_status_next_attempt_at_idx" ON "webhook_events"("status", "next_attempt_at");

-- CreateIndex
CREATE INDEX "webhook_events_status_processing_started_at_idx" ON "webhook_events"("status", "processing_started_at");

-- CreateIndex
CREATE INDEX "webhook_events_user_id_idx" ON "webhook_events"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_external_id_key" ON "webhook_events"("provider", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "device_connections_provider_provider_account_id_key" ON "device_connections"("provider", "provider_account_id");

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

