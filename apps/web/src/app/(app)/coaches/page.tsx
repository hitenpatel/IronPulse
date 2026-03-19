"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Search, UserCircle2 } from "lucide-react";

const SPECIALTIES = [
  "Powerlifting",
  "Hypertrophy",
  "Running",
  "CrossFit",
  "Olympic Lifting",
  "Yoga",
  "Nutrition",
  "Mobility",
  "HIIT",
];

export default function CoachesPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [specialty, setSpecialty] = useState<string | undefined>(undefined);
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.coach.listPublicCoaches.useInfiniteQuery(
      {
        specialty,
        search: debouncedSearch || undefined,
        limit: 20,
      },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      }
    );

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimer) clearTimeout(searchTimer);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    setSearchTimer(timer);
  }

  const coaches = data?.pages.flatMap((p) => p.coaches) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find a Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Browse certified coaches and find the right fit for your goals.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* Specialty filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSpecialty(undefined)}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            specialty === undefined
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {SPECIALTIES.map((s) => (
          <button
            key={s}
            onClick={() => setSpecialty(specialty === s ? undefined : s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              specialty === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : coaches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <UserCircle2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">No coaches found</p>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search or filters.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {coaches.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

type Coach = {
  id: string;
  userId: string;
  bio: string | null;
  specialties: string[];
  imageUrl: string | null;
  activeClientCount: number;
  user: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  };
};

function CoachCard({ coach }: { coach: Coach }) {
  const avatarSrc = coach.imageUrl ?? coach.user.avatarUrl;

  return (
    <Link href={`/coach/${coach.user.id}`}>
      <Card className="h-full transition-colors hover:bg-muted/50">
        <CardContent className="flex gap-4 py-4">
          {/* Avatar */}
          <div className="shrink-0">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt={coach.user.name ?? "Coach"}
                width={56}
                height={56}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-xl font-semibold text-muted-foreground">
                {(coach.user.name ?? "?")[0]?.toUpperCase()}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold leading-tight">
                {coach.user.name ?? "Unnamed Coach"}
              </p>
              <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3.5 w-3.5" />
                {coach.activeClientCount}
              </span>
            </div>

            {coach.bio && (
              <p className="line-clamp-2 text-xs text-muted-foreground">
                {coach.bio}
              </p>
            )}

            {coach.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {coach.specialties.slice(0, 3).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
                {coach.specialties.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{coach.specialties.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
