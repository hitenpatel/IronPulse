export function calculateStreak(activityDates: string[]): {
  current: number;
  longest: number;
} {
  if (activityDates.length === 0) return { current: 0, longest: 0 };

  const unique = [...new Set(activityDates)].sort();
  const today = new Date().toISOString().split("T")[0]!;
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0]!;
  })();

  let longest = 1;
  let current: number;
  let streak = 1;

  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1]!);
    const curr = new Date(unique[i]!);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;

    if (diff === 1) {
      streak++;
    } else {
      streak = 1;
    }

    longest = Math.max(longest, streak);
  }

  // Current streak must end today or yesterday
  const lastDate = unique[unique.length - 1]!;
  if (lastDate === today || lastDate === yesterday) {
    // Count backwards from end
    current = 1;
    for (let i = unique.length - 2; i >= 0; i--) {
      const prev = new Date(unique[i]!);
      const curr = new Date(unique[i + 1]!);
      if ((curr.getTime() - prev.getTime()) / 86400000 === 1) current++;
      else break;
    }
  } else {
    current = 0;
  }

  return { current, longest };
}
