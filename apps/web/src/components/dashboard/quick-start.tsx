import Link from "next/link";
import { Dumbbell, Activity } from "lucide-react";

export function QuickStart() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Link
        href="/workouts/new"
        className="group flex flex-col justify-between rounded-xl bg-gradient-to-br from-[#e94560] to-[#c23152] p-4 text-white transition-transform active:scale-[0.98]"
      >
        <Dumbbell className="h-6 w-6 opacity-80" />
        <div className="mt-4">
          <p className="text-xs font-medium opacity-70">Start</p>
          <p className="text-lg font-bold leading-tight">Workout</p>
          <p className="mt-1 text-xs opacity-60">Empty workout</p>
        </div>
      </Link>

      <Link
        href="/cardio/new"
        className="group flex flex-col justify-between rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] p-4 text-white transition-transform active:scale-[0.98]"
      >
        <Activity className="h-6 w-6 opacity-80" />
        <div className="mt-4">
          <p className="text-xs font-medium opacity-70">Start</p>
          <p className="text-lg font-bold leading-tight">Cardio</p>
          <p className="mt-1 text-xs opacity-60">Run · Hike · Cycle</p>
        </div>
      </Link>
    </div>
  );
}
