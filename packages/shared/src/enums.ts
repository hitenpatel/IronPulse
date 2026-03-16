export const UnitSystem = {
  METRIC: "metric",
  IMPERIAL: "imperial",
} as const;
export type UnitSystem = (typeof UnitSystem)[keyof typeof UnitSystem];

export const Tier = {
  ATHLETE: "athlete",
  COACH: "coach",
} as const;
export type Tier = (typeof Tier)[keyof typeof Tier];

export const SubscriptionStatus = {
  TRIALING: "trialing",
  ACTIVE: "active",
  PAST_DUE: "past_due",
  CANCELLED: "cancelled",
  NONE: "none",
} as const;
export type SubscriptionStatus =
  (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

export const AuthProvider = {
  EMAIL: "email",
  GOOGLE: "google",
  APPLE: "apple",
} as const;
export type AuthProvider = (typeof AuthProvider)[keyof typeof AuthProvider];

export const MuscleGroup = {
  CHEST: "chest",
  BACK: "back",
  SHOULDERS: "shoulders",
  BICEPS: "biceps",
  TRICEPS: "triceps",
  FOREARMS: "forearms",
  QUADS: "quads",
  HAMSTRINGS: "hamstrings",
  GLUTES: "glutes",
  CALVES: "calves",
  ABS: "abs",
  OBLIQUES: "obliques",
  TRAPS: "traps",
  LATS: "lats",
  LOWER_BACK: "lower_back",
  HIP_FLEXORS: "hip_flexors",
  ADDUCTORS: "adductors",
  ABDUCTORS: "abductors",
} as const;
export type MuscleGroup = (typeof MuscleGroup)[keyof typeof MuscleGroup];

export const Equipment = {
  BARBELL: "barbell",
  DUMBBELL: "dumbbell",
  KETTLEBELL: "kettlebell",
  MACHINE: "machine",
  CABLE: "cable",
  BODYWEIGHT: "bodyweight",
  BAND: "band",
  OTHER: "other",
} as const;
export type Equipment = (typeof Equipment)[keyof typeof Equipment];

export const ExerciseCategory = {
  COMPOUND: "compound",
  ISOLATION: "isolation",
  CARDIO: "cardio",
  STRETCHING: "stretching",
  PLYOMETRIC: "plyometric",
} as const;
export type ExerciseCategory =
  (typeof ExerciseCategory)[keyof typeof ExerciseCategory];

export const SetType = {
  WORKING: "working",
  WARMUP: "warmup",
  DROPSET: "dropset",
  FAILURE: "failure",
} as const;
export type SetType = (typeof SetType)[keyof typeof SetType];

export const CardioType = {
  RUN: "run",
  CYCLE: "cycle",
  SWIM: "swim",
  HIKE: "hike",
  WALK: "walk",
  ROW: "row",
  ELLIPTICAL: "elliptical",
  OTHER: "other",
} as const;
export type CardioType = (typeof CardioType)[keyof typeof CardioType];

export const CardioSource = {
  MANUAL: "manual",
  GPS: "gps",
  GPX: "gpx",
  FIT: "fit",
  GARMIN: "garmin",
  STRAVA: "strava",
} as const;
export type CardioSource = (typeof CardioSource)[keyof typeof CardioSource];

export const PRType = {
  ONE_RM: "1rm",
  THREE_RM: "3rm",
  FIVE_RM: "5rm",
  VOLUME: "volume",
} as const;
export type PRType = (typeof PRType)[keyof typeof PRType];
