-- powersync-triggers.sql
--
-- Fills the denormalized user_id column on five child tables so that
-- PowerSync sync rules can use single-table SELECT queries. PowerSync
-- data queries must SELECT from a single table; JOINs are rejected at boot.
--
-- Execution model:
--   • dev / e2e  — executed idempotently by docker/entrypoint.sh on every
--                  container start (prisma db push cannot create triggers).
--   • staging / prod — the migration 20260813120000_denormalize_user_id_for_powersync
--                      carries the identical DDL and runs via prisma migrate deploy.
--
-- All statements are idempotent (CREATE OR REPLACE FUNCTION, DROP TRIGGER IF
-- EXISTS before CREATE TRIGGER).

-- ─── workout_exercises.user_id ← workouts.user_id ────────────────────────────

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

-- ─── exercise_sets.user_id ← workout_exercises.user_id ───────────────────────
-- workout_exercises is inserted first and its trigger fills user_id, so
-- reading workout_exercises.user_id here is safe.

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

-- ─── laps.user_id ← cardio_sessions.user_id ──────────────────────────────────

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

-- ─── template_exercises.user_id ← workout_templates.user_id ─────────────────

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

-- ─── template_sets.user_id ← template_exercises.user_id ─────────────────────
-- template_exercises is inserted first and its trigger fills user_id, so
-- reading template_exercises.user_id here is safe.

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
