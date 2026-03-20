"use client";

import { ErrorState } from "@/components/ui/error-state";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <ErrorState variant="error" onRetry={reset} />
    </div>
  );
}
