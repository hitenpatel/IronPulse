"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Crown, ArrowLeft } from "lucide-react";

export default function CoachClientsPage() {
  const { data: userData, isLoading: userLoading } = trpc.user.me.useQuery();
  const user = userData?.user;

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[72px] animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.tier !== "coach") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Crown className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold">Coach Feature</h1>
          <p className="text-muted-foreground">
            Upgrade to the Coach tier to manage clients.
          </p>
          <Button asChild>
            <Link href="/settings/integrations">View Pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ClientList />;
}

function ClientList() {
  const utils = trpc.useUtils();
  const { data: clients, isLoading } = trpc.coach.clients.useQuery();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addClient = trpc.coach.addClient.useMutation({
    onSuccess: () => {
      setEmail("");
      setError(null);
      utils.coach.clients.invalidate();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleAdd() {
    if (!email.trim()) return;
    setError(null);
    addClient.mutate({ athleteEmail: email.trim() });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/coach"
          className="rounded-md p-1 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold">Clients</h1>
      </div>

      {/* Add Client */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <UserPlus className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Add Client</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="athlete@example.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button
            onClick={handleAdd}
            disabled={!email.trim() || addClient.isPending}
            className="shrink-0"
          >
            Add
          </Button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        )}
      </Card>

      {/* Client List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      ) : !clients || clients.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            <Users className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-lg font-medium">No clients yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an athlete by their email address above.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {clients.map((client) => (
            <Link key={client.assignmentId} href={`/coach/clients/${client.athleteId}`}>
              <Card className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <span className="text-sm font-semibold text-primary">
                    {(client.athleteName ?? client.athleteEmail)?.[0]?.toUpperCase() ?? "?"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {client.athleteName ?? "Unnamed"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {client.athleteEmail}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {client.programName && (
                    <Badge variant="secondary" className="text-xs">
                      {client.programName}
                    </Badge>
                  )}
                  <Badge
                    variant={client.status === "active" ? "default" : "outline"}
                    className="text-xs"
                  >
                    {client.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
