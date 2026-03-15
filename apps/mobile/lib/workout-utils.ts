export function getWorkoutName(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning Workout";
  if (hour < 17) return "Afternoon Workout";
  return "Evening Workout";
}

export function calculateVolume(
  sets: { weight_kg: number | null; reps: number | null; completed: number }[]
): number {
  return sets.reduce((sum, set) => {
    if (!set.completed || set.weight_kg == null || set.reps == null) return sum;
    return sum + set.weight_kg * set.reps;
  }, 0);
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${minutes}:${pad(seconds)}`;
}
