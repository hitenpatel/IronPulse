"use client";

import { useState } from "react";
import { TrendingDown, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export function DeloadBanner() {
  const { data, refetch } = trpc.deload.suggestion.useQuery();
  const dismiss = trpc.deload.dismiss.useMutation({ onSuccess: () => refetch() });
  const [localDismissed, setLocalDismissed] = useState(false);

  if (!data?.suggested || localDismissed) return null;

  const handleDismiss = () => {
    setLocalDismissed(true);
    if (data.notificationId) {
      dismiss.mutate({ notificationId: data.notificationId });
    }
  };

  const lifts = data.stagnantLifts.join(", ");
  const pct = Math.round((data.deloadWeightFactor ?? 0.6) * 100);

  return (
    <section
      data-testid="deload-banner"
      className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-5"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-yellow-600" />
          <h2 className="text-base font-semibold">Time for a deload week?</h2>
        </div>
        <button
          type="button"
          data-testid="deload-banner-dismiss"
          onClick={handleDismiss}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss deload suggestion"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="text-sm text-muted-foreground">
        Your volume on <strong>{lifts}</strong> has been flat for 4+ weeks.
        Training at {pct}% of your working weight for one week can restore
        adaptation and prevent a plateau.
      </p>
    </section>
  );
}
