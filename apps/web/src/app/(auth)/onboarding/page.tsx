"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const { data: session } = useSession();
  const [name, setName] = useState(session?.user?.name ?? "");
  const [unitSystem, setUnitSystem] = useState<"metric" | "imperial">("metric");
  const [error, setError] = useState<string | null>(null);

  const completeOnboarding = trpc.user.completeOnboarding.useMutation({
    onSuccess: () => {
      window.location.href = "/dashboard";
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    completeOnboarding.mutate({
      name: name.trim(),
      unitSystem,
    });
  }

  return (
    <div>
      <h2 className="text-xl font-bold">Let&apos;s get you set up</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Just a couple of things before you start
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="mt-1.5"
          />
        </div>

        <div>
          <Label>Unit preference</Label>
          <div className="mt-1.5 flex gap-3">
            <button
              type="button"
              onClick={() => setUnitSystem("metric")}
              className={cn(
                "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                unitSystem === "metric"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              Metric
              <span className="mt-0.5 block text-xs font-normal opacity-70">
                kg, km
              </span>
            </button>
            <button
              type="button"
              onClick={() => setUnitSystem("imperial")}
              className={cn(
                "flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                unitSystem === "imperial"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              )}
            >
              Imperial
              <span className="mt-0.5 block text-xs font-normal opacity-70">
                lbs, mi
              </span>
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={completeOnboarding.isPending}
        >
          {completeOnboarding.isPending ? "Setting up..." : "Get started"}
        </Button>
      </form>
    </div>
  );
}
