"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ClipboardList, MessageSquare, Crown } from "lucide-react";

export default function CoachDashboardPage() {
  const { data, isLoading } = trpc.user.me.useQuery();

  const user = data?.user;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[120px] animate-pulse rounded-xl bg-muted" />
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
          <h1 className="text-2xl font-bold">Coach Dashboard</h1>
          <p className="text-muted-foreground">
            Upgrade to the Coach tier to manage clients, build programs, and
            communicate with athletes.
          </p>
          <Button asChild>
            <Link href="/settings/integrations">View Pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <CoachOverview />;
}

function CoachOverview() {
  const { data: clients } = trpc.coach.clients.useQuery();
  const { data: programs } = trpc.program.list.useQuery();

  const clientCount = clients?.length ?? 0;
  const programCount = programs?.length ?? 0;

  const cards = [
    {
      title: "Clients",
      value: clientCount,
      description: "Active athletes",
      icon: Users,
      href: "/coach/clients",
    },
    {
      title: "Programs",
      value: programCount,
      description: "Training programs",
      icon: ClipboardList,
      href: "/coach/programs",
    },
    {
      title: "Messages",
      value: null,
      description: "Coach-athlete chat",
      icon: MessageSquare,
      href: "/messages",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Coach Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.title} href={card.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {card.value !== null && (
                  <p className="text-2xl font-bold">{card.value}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
