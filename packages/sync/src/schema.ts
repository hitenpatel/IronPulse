import { column, Schema, Table } from "@powersync/web";

const workouts = new Table(
  {
    user_id: column.text,
    name: column.text,
    started_at: column.text,
    completed_at: column.text,
    duration_seconds: column.integer,
    notes: column.text,
    template_id: column.text,
    created_at: column.text,
  },
  { indexes: { user: ["user_id"] } }
);

const workout_exercises = new Table(
  {
    workout_id: column.text,
    exercise_id: column.text,
    order: column.integer,
    notes: column.text,
  },
  { indexes: { workout: ["workout_id"] } }
);

const exercise_sets = new Table(
  {
    workout_exercise_id: column.text,
    set_number: column.integer,
    type: column.text,
    weight_kg: column.real,
    reps: column.integer,
    rpe: column.real,
    rest_seconds: column.integer,
    completed: column.integer,
  },
  { indexes: { exercise: ["workout_exercise_id"] } }
);

const cardio_sessions = new Table(
  {
    user_id: column.text,
    type: column.text,
    source: column.text,
    started_at: column.text,
    duration_seconds: column.integer,
    distance_meters: column.real,
    elevation_gain_m: column.real,
    avg_heart_rate: column.integer,
    max_heart_rate: column.integer,
    calories: column.integer,
    route_file_url: column.text,
    external_id: column.text,
    notes: column.text,
    created_at: column.text,
  },
  { indexes: { user: ["user_id"] } }
);

const laps = new Table(
  {
    session_id: column.text,
    lap_number: column.integer,
    distance_meters: column.real,
    duration_seconds: column.integer,
    avg_heart_rate: column.integer,
  },
  { indexes: { session: ["session_id"] } }
);

const workout_templates = new Table(
  {
    user_id: column.text,
    name: column.text,
    created_at: column.text,
  },
  { indexes: { user: ["user_id"] } }
);

const template_exercises = new Table(
  {
    template_id: column.text,
    exercise_id: column.text,
    order: column.integer,
    notes: column.text,
  },
  { indexes: { template: ["template_id"] } }
);

const template_sets = new Table(
  {
    template_exercise_id: column.text,
    set_number: column.integer,
    target_reps: column.integer,
    target_weight_kg: column.real,
    type: column.text,
  },
  { indexes: { template_exercise: ["template_exercise_id"] } }
);

const body_metrics = new Table(
  {
    user_id: column.text,
    date: column.text,
    weight_kg: column.real,
    body_fat_pct: column.real,
    measurements: column.text,
    created_at: column.text,
  },
  { indexes: { user: ["user_id"] } }
);

const personal_records = new Table(
  {
    user_id: column.text,
    exercise_id: column.text,
    type: column.text,
    value: column.real,
    achieved_at: column.text,
    set_id: column.text,
    created_at: column.text,
  },
  { indexes: { user: ["user_id"], exercise: ["exercise_id"] } }
);

const exercises = new Table({
  name: column.text,
  category: column.text,
  primary_muscles: column.text,
  secondary_muscles: column.text,
  equipment: column.text,
  instructions: column.text,
  image_urls: column.text,
  video_urls: column.text,
  is_custom: column.integer,
  created_by_id: column.text,
  created_at: column.text,
});

export const AppSchema = new Schema({
  workouts,
  workout_exercises,
  exercise_sets,
  cardio_sessions,
  laps,
  workout_templates,
  template_exercises,
  template_sets,
  body_metrics,
  personal_records,
  exercises,
});

export type Database = (typeof AppSchema)["types"];
