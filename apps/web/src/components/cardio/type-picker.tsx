"use client";

import {
  Footprints,
  Bike,
  Waves,
  Mountain,
  PersonStanding,
  Ship,
  Activity,
  CircleDot,
} from "lucide-react";

const CARDIO_TYPES = [
  { value: "run", label: "Run", icon: Footprints },
  { value: "cycle", label: "Cycle", icon: Bike },
  { value: "swim", label: "Swim", icon: Waves },
  { value: "hike", label: "Hike", icon: Mountain },
  { value: "walk", label: "Walk", icon: PersonStanding },
  { value: "row", label: "Row", icon: Ship },
  { value: "elliptical", label: "Elliptical", icon: Activity },
  { value: "other", label: "Other", icon: CircleDot },
] as const;

interface TypePickerProps {
  onSelect: (type: string) => void;
}

export function TypePicker({ onSelect }: TypePickerProps) {
  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        What type of cardio?
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {CARDIO_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => onSelect(value)}
            className="flex flex-col items-center gap-2 rounded-xl border border-border px-4 py-5 transition-colors hover:border-foreground hover:bg-muted active:scale-95"
          >
            <Icon className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
