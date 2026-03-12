"use client";

import { useSession } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getGreeting } from "@/lib/format";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]![0]!.toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function getFirstName(name: string | null | undefined): string {
  if (!name) return "there";
  const first = name.trim().split(/\s+/)[0];
  return first || "there";
}

export function Greeting() {
  const { data: session } = useSession();
  const name = session?.user?.name;
  const avatarUrl = session?.user?.image;

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">
          {getGreeting()}, {getFirstName(name)}
        </h1>
        <p className="text-sm text-muted-foreground">{dateStr}</p>
      </div>
      <Avatar className="h-10 w-10">
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name ?? "User"} />}
        <AvatarFallback className="bg-muted text-sm">
          {getInitials(name)}
        </AvatarFallback>
      </Avatar>
    </div>
  );
}
