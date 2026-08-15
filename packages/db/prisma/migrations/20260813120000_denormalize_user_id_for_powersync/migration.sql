-- Migration: denormalize user_id onto five child tables for PowerSync
--
-- PowerSync data queries must SELECT from a single table; JOINs are rejected
-- at boot. This migration adds a trigger-filled user_id column to the five
-- child tables so sync-rules.yaml can use simple single-table queries.
--
-- The same trigger DDL is also in packages/db/prisma/powersync-triggers.sql,
-- which docker/entrypoint.sh runs idempotently in dev/e2e environments where
-- prisma db push is used instead of prisma migrate deploy.

-- ─── Add columns ─────────────────────────────────────────────────────────────

ALTER TABLE workout_exercises  ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE exercise_sets      ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE laps               ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE template_exercises ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE template_sets      ADD COLUMN IF NOT EXISTS user_id UUID;

-- ─── Backfill existing rows ───────────────────────────────────────────────────

UPDATE workout_exercises we
SET user_id = w.user_id
FROM workouts w
WHERE we.workout_id = w.id;

UPDATE exercise_sets es
SET user_id = w.user_id
FROM workout_exercises we
JOIN workouts w ON we.workout_id = w.id
WHERE es.workout_exercise_id = we.id;

UPDATE laps l
SET user_id = cs.user_id
FROM cardio_sessions cs
WHERE l.session_id = cs.id;

UPDATE template_exercises te
SET user_id = wt.user_id
FROM workout_templates wt
WHERE te.template_id = wt.id;

UPDATE template_sets ts
SET user_id = wt.user_id
FROM template_exercises te
JOIN workout_templates wt ON te.template_id = wt.id
WHERE ts.template_exercise_id = te.id;

-- ─── Indexes (Prisma default naming: <table>_<column>_idx) ───────────────────

CREATE INDEX IF NOT EXISTS "workout_exercises_user_id_idx"  ON workout_exercises(user_id);
CREATE INDEX IF NOT EXISTS "exercise_sets_user_id_idx"      ON exercise_sets(user_id);
CREATE INDEX IF NOT EXISTS "laps_user_id_idx"               ON laps(user_id);
CREATE INDEX IF NOT EXISTS "template_exercises_user_id_idx" ON template_exercises(user_id);
CREATE INDEX IF NOT EXISTS "template_sets_user_id_idx"      ON template_sets(user_id);

-- ─── Trigger functions ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fn_fill_user_id_workout_exercises()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM workouts WHERE id = NEW.workout_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_user_id ON workout_exercises;
CREATE TRIGGER trg_fill_user_id
  BEFORE INSERT ON workout_exercises
  FOR EACH ROW EXECUTE FUNCTION fn_fill_user_id_workout_exercises();

CREATE OR REPLACE FUNCTION fn_fill_user_id_exercise_sets()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM workout_exercises WHERE id = NEW.workout_exercise_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_user_id ON exercise_sets;
CREATE TRIGGER trg_fill_user_id
  BEFORE INSERT ON exercise_sets
  FOR EACH ROW EXECUTE FUNCTION fn_fill_user_id_exercise_sets();

CREATE OR REPLACE FUNCTION fn_fill_user_id_laps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM cardio_sessions WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_user_id ON laps;
CREATE TRIGGER trg_fill_user_id
  BEFORE INSERT ON laps
  FOR EACH ROW EXECUTE FUNCTION fn_fill_user_id_laps();

CREATE OR REPLACE FUNCTION fn_fill_user_id_template_exercises()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM workout_templates WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_user_id ON template_exercises;
CREATE TRIGGER trg_fill_user_id
  BEFORE INSERT ON template_exercises
  FOR EACH ROW EXECUTE FUNCTION fn_fill_user_id_template_exercises();

CREATE OR REPLACE FUNCTION fn_fill_user_id_template_sets()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  SELECT user_id INTO NEW.user_id FROM template_exercises WHERE id = NEW.template_exercise_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fill_user_id ON template_sets;
CREATE TRIGGER trg_fill_user_id
  BEFORE INSERT ON template_sets
  FOR EACH ROW EXECUTE FUNCTION fn_fill_user_id_template_sets();
