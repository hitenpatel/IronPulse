-- CreateTable
CREATE TABLE "workout_efficiency_events" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "is_first_completed_set" BOOLEAN NOT NULL,
    "interaction_count" INTEGER NOT NULL,
    "ms_since_session_start" INTEGER,
    "is_new_athlete" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workout_efficiency_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_efficiency_events_session_id_idx" ON "workout_efficiency_events"("session_id");

-- CreateIndex
CREATE INDEX "workout_efficiency_events_created_at_idx" ON "workout_efficiency_events"("created_at");

