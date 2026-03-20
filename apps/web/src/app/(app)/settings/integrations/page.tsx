"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Link2, Link2Off, Watch } from "lucide-react";

export default function IntegrationsPage() {
  const { data: connections, isLoading } =
    trpc.integration.listConnections.useQuery();
  const utils = trpc.useUtils();

  const disconnect = trpc.integration.disconnectProvider.useMutation({
    onSuccess: () => {
      utils.integration.listConnections.invalidate();
    },
  });

  const stravaConnection = connections?.find((c) => c.provider === "strava");
  const garminConnection = connections?.find((c) => c.provider === "garmin");

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Connected Apps</h1>

      {isLoading ? (
        <div className="h-[140px] animate-pulse rounded-lg bg-muted" />
      ) : (
        <>
          {/* Strava Card */}
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <svg
                viewBox="0 0 24 24"
                className="h-6 w-6 fill-[#FC4C02]"
                aria-hidden
              >
                <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
              </svg>
              <h2 className="font-semibold text-foreground">Strava</h2>
            </div>
            {stravaConnection ? (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <Link2 className="h-4 w-4" />
                    Connected
                  </div>
                  {stravaConnection.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last synced{" "}
                      {new Date(
                        stravaConnection.lastSyncedAt,
                      ).toLocaleDateString("en-US", {
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
                  onClick={() =>
                    disconnect.mutate({ provider: "strava" })
                  }
                >
                  <Link2Off className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Not connected</p>
                <Button asChild size="sm">
                  <a href="/api/strava/connect">Connect</a>
                </Button>
              </div>
            )}
          </div>

          {/* Garmin Card */}
          <div className="bg-card rounded-lg border border-border p-5">
            <div className="flex items-center gap-3 mb-4">
              <Watch className="h-6 w-6 text-[#007CC3]" aria-hidden />
              <h2 className="font-semibold text-foreground">Garmin Connect</h2>
            </div>
            {garminConnection ? (
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium text-success">
                    <Link2 className="h-4 w-4" />
                    Connected
                  </div>
                  {garminConnection.lastSyncedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last synced{" "}
                      {new Date(
                        garminConnection.lastSyncedAt,
                      ).toLocaleDateString("en-US", {
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
                  onClick={() =>
                    disconnect.mutate({ provider: "garmin" })
                  }
                >
                  <Link2Off className="h-4 w-4" />
                  Disconnect
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Not connected</p>
                <Button asChild size="sm">
                  <a href="/api/garmin/connect">Connect</a>
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
