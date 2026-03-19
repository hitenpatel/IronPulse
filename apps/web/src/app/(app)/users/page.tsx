"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, UserPlus, UserMinus } from "lucide-react";

export default function UsersPage() {
  const utils = trpc.useUtils();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading } = trpc.social.searchUsers.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length > 0 }
  );

  const { data: followingData } = trpc.social.following.useQuery();

  const followingIds = new Set(
    followingData?.following.map((u) => u.id) ?? []
  );

  const follow = trpc.social.follow.useMutation({
    onSuccess: () => {
      utils.social.following.invalidate();
      utils.social.searchUsers.invalidate();
    },
  });

  const unfollow = trpc.social.unfollow.useMutation({
    onSuccess: () => {
      utils.social.following.invalidate();
      utils.social.searchUsers.invalidate();
    },
  });

  const users = data?.users ?? [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Find Users</h1>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-10"
        />
      </div>

      {debouncedQuery.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          Start typing to search for users.
        </p>
      ) : isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl bg-muted"
            />
          ))}
        </div>
      ) : users.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">
          No users found.
        </p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const isFollowing = followingIds.has(user.id);
            return (
              <Card key={user.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {user.name ?? "Unknown"}
                    </p>
                  </div>
                  <Button
                    variant={isFollowing ? "outline" : "default"}
                    size="sm"
                    className="shrink-0 ml-3"
                    disabled={follow.isPending || unfollow.isPending}
                    onClick={() =>
                      isFollowing
                        ? unfollow.mutate({ userId: user.id })
                        : follow.mutate({ userId: user.id })
                    }
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="mr-1.5 h-4 w-4" />
                        Unfollow
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-1.5 h-4 w-4" />
                        Follow
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
