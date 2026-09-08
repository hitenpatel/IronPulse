-- CreateTable
CREATE TABLE "injury_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "injured_at" DATE NOT NULL,
    "injury_type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL,
    "body_parts" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "resolved_at" DATE,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "injury_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recovery_activities" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "injury_id" UUID NOT NULL,
    "performed_at" DATE NOT NULL,
    "modality" TEXT NOT NULL,
    "duration_mins" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recovery_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exercise_restrictions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "injury_id" UUID NOT NULL,
    "muscle_groups" TEXT[],
    "note" TEXT,
    "starts_at" DATE NOT NULL,
    "expires_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exercise_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "injury_logs_user_id_injured_at_idx" ON "injury_logs"("user_id", "injured_at");

-- CreateIndex
CREATE INDEX "injury_logs_user_id_status_idx" ON "injury_logs"("user_id", "status");

-- CreateIndex
CREATE INDEX "recovery_activities_user_id_performed_at_idx" ON "recovery_activities"("user_id", "performed_at");

-- CreateIndex
CREATE INDEX "recovery_activities_injury_id_idx" ON "recovery_activities"("injury_id");

-- CreateIndex
CREATE INDEX "exercise_restrictions_user_id_expires_at_idx" ON "exercise_restrictions"("user_id", "expires_at");

-- AddForeignKey
ALTER TABLE "injury_logs" ADD CONSTRAINT "injury_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_activities" ADD CONSTRAINT "recovery_activities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recovery_activities" ADD CONSTRAINT "recovery_activities_injury_id_fkey" FOREIGN KEY ("injury_id") REFERENCES "injury_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_restrictions" ADD CONSTRAINT "exercise_restrictions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exercise_restrictions" ADD CONSTRAINT "exercise_restrictions_injury_id_fkey" FOREIGN KEY ("injury_id") REFERENCES "injury_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

