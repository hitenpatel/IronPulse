"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

export function SleepEmptyCta() {
  return (
    <div className="py-6 space-y-4">
      <p className="text-center text-sm text-muted-foreground">
        Connect a sleep tracker to see your trends automatically, or log manually below.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/integrations">
            <Zap className="mr-1.5 h-3.5 w-3.5" />
            Connect Oura
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/integrations">
            Connect Apple Health
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href="#sleep-log-form">Log manually</a>
        </Button>
      </div>
    </div>
  );
}
