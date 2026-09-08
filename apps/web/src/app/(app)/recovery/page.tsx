"use client";

import Link from "next/link";
import { useState } from "react";
import { HeartPulse } from "lucide-react";
import { injuryStatusEnum, type InjuryStatus } from "@zor/shared";
import { trpc } from "@/lib/trpc/client";
import { formatUTCDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogInjuryForm } from "./log-injury-form";

const STATUS_LABELS: Record<InjuryStatus, string> = {
  active: "Active",
  recovering: "Recovering",
  resolved: "Resolved",
};

const STATUS_BADGE_VARIANT: Record<
  InjuryStatus,
  "destructive" | "warning" | "success"
> = {
  active: "destructive",
  recovering: "warning",
  resolved: "success",
};

export default function RecoveryPage() {
  const [bodyPart, setBodyPart] = useState("");
  const [status, setStatus] = useState<InjuryStatus | "">("");

  const { data, isLoading } = trpc.injury.list.useQuery({
    ...(bodyPart.trim() !== "" && { bodyPart: bodyPart.trim() }),
    ...(status !== "" && { status }),
  });

  const injuries = data?.data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Recovery</h1>

      <LogInjuryForm />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Injury history</h2>

        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            placeholder="Filter by body part"
            value={bodyPart}
            onChange={(e) => setBodyPart(e.target.value)}
            aria-label="Filter by body part"
            className="flex-1 min-w-[160px] rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as InjuryStatus | "")}
            aria-label="Filter by status"
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="">All statuses</option>
            {injuryStatusEnum.options.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : injuries.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center">
              <HeartPulse className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No injuries logged yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {injuries.map((injury) => {
              const injuryStatus = injury.status as InjuryStatus;
              return (
                <Link key={injury.id} href={`/recovery/${injury.id}`}>
                  <Card className="p-3 transition-colors hover:bg-accent/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium capitalize">
                            {injury.injuryType}
                          </span>
                          <Badge variant={STATUS_BADGE_VARIANT[injuryStatus]}>
                            {STATUS_LABELS[injuryStatus]}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs capitalize text-muted-foreground">
                          {injury.bodyParts.join(", ")} · Severity{" "}
                          {injury.severity}/10
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatUTCDate(injury.injuredAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
