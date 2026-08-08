export function resolveSeedPassword(env: Record<string, string | undefined>): string {
  return env.SEED_USER_PASSWORD ?? "password123";
}

export function shouldSkipDevSeed(
  existingWorkoutCount: number,
  env: Record<string, string | undefined>,
): boolean {
  if (env.SEED_DEV_FORCE === "1") return false;
  return existingWorkoutCount > 0;
}
