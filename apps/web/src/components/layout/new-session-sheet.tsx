"use client";

import Link from "next/link";
import { Dumbbell, Activity } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface NewSessionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewSessionSheet({ open, onOpenChange }: NewSessionSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Start New Session</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-4 py-6">
          <Link
            href="/workouts/new"
            onClick={() => onOpenChange(false)}
            className="flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br from-[#e94560] to-[#c23152] p-6 text-white transition-transform active:scale-95"
          >
            <Dumbbell className="h-8 w-8" />
            <div className="text-center">
              <p className="text-sm font-medium opacity-80">Start</p>
              <p className="text-lg font-bold">Workout</p>
            </div>
          </Link>

          <Link
            href="/cardio/new"
            onClick={() => onOpenChange(false)}
            className="flex flex-col items-center gap-3 rounded-xl bg-gradient-to-br from-[#0ea5e9] to-[#0284c7] p-6 text-white transition-transform active:scale-95"
          >
            <Activity className="h-8 w-8" />
            <div className="text-center">
              <p className="text-sm font-medium opacity-80">Log</p>
              <p className="text-lg font-bold">Cardio</p>
            </div>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
