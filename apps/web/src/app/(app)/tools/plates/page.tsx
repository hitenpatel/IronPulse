"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dumbbell } from "lucide-react";

const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25] as const;
type PlateSize = (typeof PLATE_SIZES)[number];

const PLATE_COLORS: Record<PlateSize, string> = {
  25: "bg-red-500",
  20: "bg-blue-500",
  15: "bg-yellow-400",
  10: "bg-green-500",
  5: "bg-white border border-border",
  2.5: "bg-orange-400",
  1.25: "bg-zinc-400",
};

const PLATE_HEIGHTS: Record<PlateSize, string> = {
  25: "h-24",
  20: "h-20",
  15: "h-16",
  10: "h-12",
  5: "h-9",
  2.5: "h-7",
  1.25: "h-5",
};

interface PlateResult {
  platesPerSide: { size: PlateSize; count: number }[];
  remainder: number;
  totalLoaded: number;
}

function calculatePlates(targetKg: number, barKg: number): PlateResult | null {
  const weightPerSide = (targetKg - barKg) / 2;
  if (weightPerSide < 0) return null;

  let remaining = weightPerSide;
  const platesPerSide: { size: PlateSize; count: number }[] = [];

  for (const plate of PLATE_SIZES) {
    if (remaining <= 0) break;
    const count = Math.floor(remaining / plate);
    if (count > 0) {
      platesPerSide.push({ size: plate, count });
      remaining -= count * plate;
    }
  }

  // Round to avoid floating-point noise
  remaining = Math.round(remaining * 1000) / 1000;
  const totalLoaded = barKg + (weightPerSide - remaining) * 2;

  return { platesPerSide, remainder: remaining, totalLoaded };
}

function PlateStack({ plates }: { plates: { size: PlateSize; count: number }[] }) {
  // Flatten into individual plates in order
  const individualPlates: PlateSize[] = [];
  for (const { size, count } of plates) {
    for (let i = 0; i < count; i++) {
      individualPlates.push(size);
    }
  }

  if (individualPlates.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No plates needed
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center gap-0.5">
      {/* Bar stub */}
      <div className="w-8 h-2 bg-zinc-500 rounded-l-full self-center" />

      {/* Plates */}
      <div className="flex items-center gap-0.5">
        {individualPlates.map((plate, i) => (
          <div
            key={i}
            className={`w-5 rounded-sm ${PLATE_HEIGHTS[plate]} ${PLATE_COLORS[plate]} flex items-center justify-center`}
            title={`${plate} kg`}
          >
            <span
              className="text-[8px] font-bold rotate-90 whitespace-nowrap leading-none"
              style={{
                color: plate === 5 ? "#000" : plate === 15 ? "#000" : "#fff",
              }}
            >
              {plate}
            </span>
          </div>
        ))}
      </div>

      {/* Bar end */}
      <div className="w-8 h-2 bg-zinc-500 rounded-r-full self-center" />
    </div>
  );
}

export default function PlatesPage() {
  const [targetWeight, setTargetWeight] = useState("");
  const [barWeight, setBarWeight] = useState("20");
  const [result, setResult] = useState<PlateResult | null>(null);
  const [error, setError] = useState("");

  const handleCalculate = () => {
    setError("");
    const target = parseFloat(targetWeight);
    const bar = parseFloat(barWeight);

    if (isNaN(target) || target <= 0) {
      setError("Please enter a valid target weight.");
      return;
    }
    if (isNaN(bar) || bar < 0) {
      setError("Please enter a valid bar weight.");
      return;
    }
    if (target < bar) {
      setError("Target weight must be greater than or equal to bar weight.");
      return;
    }

    const calc = calculatePlates(target, bar);
    if (!calc) {
      setError("Unable to calculate — check your inputs.");
      return;
    }
    setResult(calc);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCalculate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Dumbbell className="h-6 w-6" />
        Plate Calculator
      </h1>
      <p className="text-sm text-muted-foreground">
        Find the exact plates to load per side for any barbell weight.
      </p>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Enter target weight</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="target">Target weight (kg)</Label>
              <Input
                id="target"
                type="number"
                min="1"
                step="0.5"
                placeholder="e.g. 100"
                value={targetWeight}
                onChange={(e) => setTargetWeight(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bar">Bar weight (kg)</Label>
              <Input
                id="bar"
                type="number"
                min="0"
                step="0.5"
                placeholder="e.g. 20"
                value={barWeight}
                onChange={(e) => setBarWeight(e.target.value)}
                onKeyDown={handleKeyDown}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleCalculate} className="w-full">
            Calculate Plates
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Result</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Total loaded</p>
                  <p className="text-2xl font-bold text-primary">
                    {result.totalLoaded.toFixed(2).replace(/\.?0+$/, "")} kg
                  </p>
                </div>
                {result.remainder > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground">Not achievable</p>
                    <p className="text-sm text-destructive font-medium">
                      {result.remainder} kg per side cannot be loaded with standard plates
                    </p>
                  </div>
                )}
              </div>

              {/* Plate breakdown per side */}
              {result.platesPerSide.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    Plates per side
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {result.platesPerSide.map(({ size, count }) => (
                      <div
                        key={size}
                        className="flex items-center gap-1.5 rounded-md border bg-muted px-3 py-1.5"
                      >
                        <div
                          className={`h-4 w-4 rounded-sm ${PLATE_COLORS[size]}`}
                        />
                        <span className="text-sm font-semibold">{count} × {size} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No plates needed — target equals bar weight.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Visual representation */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="py-4">
                <PlateStack plates={result.platesPerSide} />
              </div>
              <p className="text-center text-xs text-muted-foreground mt-2">
                Showing one side — mirror for the other side
              </p>
            </CardContent>
          </Card>

          {/* Available plate sizes legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Available plates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {PLATE_SIZES.map((size) => (
                  <div key={size} className="flex items-center gap-1.5">
                    <div className={`h-3 w-3 rounded-sm ${PLATE_COLORS[size]}`} />
                    <span className="text-xs text-muted-foreground">{size} kg</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
