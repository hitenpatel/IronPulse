"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Link2, Link2Off, Watch, Moon, Scale, Activity, BarChart3 } from "lucide-react";

function ConnectionCard({
  name,
  icon,
  provider,
  connection,
  connectHref,
  disconnect,
}: {
  name: string;
  icon: React.ReactNode;
  provider: string;
  connection: any;
  connectHref?: string;
  disconnect: any;
}) {
  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="font-semibold text-foreground">{name}</h2>
      </div>
      {connection ? (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <Link2 className="h-4 w-4" />
              Connected
            </div>
            {connection.lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                Last synced{" "}
                {new Date(connection.lastSyncedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate({ provider })}
          >
            <Link2Off className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Not connected</p>
          {connectHref && (
            <Button asChild size="sm">
              <a href={connectHref}>Connect</a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function IntervalsIcuCard({
  connection,
  disconnect,
}: {
  connection: any;
  disconnect: any;
}) {
  const utils = trpc.useUtils();
  const [apiKey, setApiKey] = useState("");
  const [athleteId, setAthleteId] = useState("");

  const connectMutation = trpc.integration.completeIntervalsIcuAuth.useMutation({
    onSuccess: () => {
      utils.integration.listConnections.invalidate();
      setApiKey("");
      setAthleteId("");
    },
  });

  return (
    <div className="bg-card rounded-lg border border-border p-5">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="h-6 w-6 text-[#FF6B35]" aria-hidden />
        <h2 className="font-semibold text-foreground">Intervals.icu</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Sync activities from Garmin, Strava, and other sources via Intervals.icu
      </p>
      {connection ? (
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm font-medium text-success">
              <Link2 className="h-4 w-4" />
              Connected (athlete {connection.providerAccountId})
            </div>
            {connection.lastSyncedAt && (
              <p className="text-xs text-muted-foreground">
                Last synced{" "}
                {new Date(connection.lastSyncedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>
          <Button
            variant="destructive"
            size="sm"
            disabled={disconnect.isPending}
            onClick={() => disconnect.mutate({ provider: "intervals_icu" })}
          >
            <Link2Off className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Athlete ID (e.g. i12345)"
              value={athleteId}
              onChange={(e) => setAthleteId(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
            <input
              type="password"
              placeholder="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            />
          </div>
          {connectMutation.error && (
            <p className="text-xs text-destructive">{connectMutation.error.message}</p>
          )}
          <Button
            size="sm"
            disabled={!apiKey || !athleteId || connectMutation.isPending}
            onClick={() => connectMutation.mutate({ apiKey, athleteId })}
          >
            {connectMutation.isPending ? "Connecting..." : "Connect"}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function IntegrationsPage() {
  const { data: connections, isLoading } =
    trpc.integration.listConnections.useQuery();
  const utils = trpc.useUtils();

  const disconnect = trpc.integration.disconnectProvider.useMutation({
    onSuccess: () => {
      utils.integration.listConnections.invalidate();
    },
  });

  const findConnection = (provider: string) =>
    connections?.find((c) => c.provider === provider);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Connected Apps</h1>

      {isLoading ? (
        <div className="h-[140px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <>
          <ConnectionCard
            name="Strava"
            provider="strava"
            icon={
              <svg viewBox="0 0 24 24" className="h-6 w-6 fill-[#FC4C02]" aria-hidden>
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
            }
            connection={findConnection("strava")}
            connectHref="/api/strava/connect"
            disconnect={disconnect}
          />

          <ConnectionCard
            name="Garmin Connect"
            provider="garmin"
            icon={<Watch className="h-6 w-6 text-[#007CC3]" aria-hidden />}
            connection={findConnection("garmin")}
            connectHref="/api/garmin/connect"
            disconnect={disconnect}
          />

          <ConnectionCard
            name="Polar"
            provider="polar"
            icon={<Activity className="h-6 w-6 text-[#D10A11]" aria-hidden />}
            connection={findConnection("polar")}
            connectHref="/api/polar/connect"
            disconnect={disconnect}
          />

          <ConnectionCard
            name="Withings"
            provider="withings"
            icon={<Scale className="h-6 w-6 text-[#00B4D8]" aria-hidden />}
            connection={findConnection("withings")}
            connectHref="/api/withings/connect"
            disconnect={disconnect}
          />

          <ConnectionCard
            name="Oura"
            provider="oura"
            icon={<Moon className="h-6 w-6 text-[#C4B5FD]" aria-hidden />}
            connection={findConnection("oura")}
            connectHref="/api/oura/connect"
            disconnect={disconnect}
          />

          <IntervalsIcuCard
            connection={findConnection("intervals_icu")}
            disconnect={disconnect}
          />
        </>
      )}
    </div>
  );
}
