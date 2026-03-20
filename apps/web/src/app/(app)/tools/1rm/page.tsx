"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface OneRMResult {
  epley: number;
  brzycki: number;
  lander: number;
  average: number;
}

const PERCENTAGES = [100, 95, 90, 85, 80, 75, 70, 65, 60] as const;

function calculate1RM(weight: number, reps: number): OneRMResult {
  const epley = weight * (1 + reps / 30);
  const brzycki = weight * (36 / (37 - reps));
  const lander = (100 * weight) / (101.3 - 2.67123 * reps);
  const average = (epley + brzycki + lander) / 3;
  return { epley, brzycki, lander, average };
}

export default function OneRMPage() {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [result, setResult] = useState<OneRMResult | null>(null);
  const [error, setError] = useState("");

  const handleCalculate = () => {
    setError("");
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);

    if (isNaN(w) || w <= 0) {
      setError("Please enter a valid weight.");
      return;
    }
    if (isNaN(r) || r < 1 || r > 36) {
      setError("Reps must be between 1 and 36.");
      return;
    }
    if (r === 1) {
      setResult({ epley: w, brzycki: w, lander: w, average: w });
      return;
    }

    setResult(calculate1RM(w, r));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCalculate();
  };

  return (
    <div className="mx-auto max-w-[600px] space-y-6 p-4">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          1RM Calculator
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Estimate your one-rep max using three validated formulas.
        </p>
      </div>

      {/* Input Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="font-semibold text-foreground mb-4">Enter your lift</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="1"
                step="0.5"
                placeholder="e.g. 100"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-14 font-display font-semibold text-2xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reps">Reps performed</Label>
              <Input
                id="reps"
                type="number"
                min="1"
                max="36"
                step="1"
                placeholder="e.g. 5"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-14 font-display font-semibold text-2xl"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleCalculate} className="w-full">
            Calculate 1RM
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Main result card with top border accent */}
          <div className="bg-card border-t-[3px] border-t-primary rounded-lg border border-border p-5">
            <h2 className="font-semibold text-foreground mb-4">Estimated 1RM</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-primary/10 p-3 text-center col-span-2 sm:col-span-1">
                <p className="text-xs text-muted-foreground">Average</p>
                <p className="font-display font-bold text-5xl text-primary leading-tight">
                  {result.average.toFixed(1)}
                </p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Epley</p>
                <p className="font-display font-semibold text-xl text-foreground">{result.epley.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Brzycki</p>
                <p className="font-display font-semibold text-xl text-foreground">{result.brzycki.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
              <div className="rounded-lg bg-muted/30 p-3 text-center">
                <p className="text-xs text-muted-foreground">Lander</p>
                <p className="font-display font-semibold text-xl text-foreground">{result.lander.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">kg</p>
              </div>
            </div>
          </div>

          {/* Percentage Table */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h2 className="font-semibold text-foreground mb-4">Training Percentages</h2>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                      %
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Average (kg)
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Epley (kg)
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Brzycki (kg)
                    </th>
                    <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                      Lander (kg)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PERCENTAGES.map((pct) => {
                    const factor = pct / 100;
                    return (
                      <tr
                        key={pct}
                        className="border-b border-border last:border-0 even:bg-muted/20 hover:bg-muted/30 transition-colors"
                      >
                        <td className="px-4 py-2 font-semibold text-foreground">{pct}%</td>
                        <td className="px-4 py-2 text-right font-medium text-primary">
                          {(result.average * factor).toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {(result.epley * factor).toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {(result.brzycki * factor).toFixed(1)}
                        </td>
                        <td className="px-4 py-2 text-right text-muted-foreground">
                          {(result.lander * factor).toFixed(1)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
