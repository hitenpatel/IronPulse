"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  ChevronLeft,
  Users,
  UserPlus,
  UserMinus,
  Dumbbell,
  Activity,
  Trophy,
} from "lucide-react";

function getActivityIcon(type: string) {
  switch (type) {
    case "workout":
      return <Dumbbell className="h-4 w-4 text-blue-400" />;
    case "cardio":
      return <Activity className="h-4 w-4 text-green-400" />;
    case "pr":
      return <Trophy className="h-4 w-4 text-yellow-400" />;
    default:
      return <Activity className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActivityText(type: string) {
  switch (type) {
    case "workout":
      return "completed a workout";
    case "cardio":
      return "finished a cardio session";
    case "pr":
      return "set a new personal record!";
    default:
      return "logged an activity";
  }
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();

  const { data: profile, isLoading } = trpc.social.getUserProfile.useQuery(
    { userId: id },
    { enabled: !!id }
  );

  const follow = trpc.social.follow.useMutation({
    onSuccess: () => {
      utils.social.getUserProfile.invalidate({ userId: id });
      utils.social.following.invalidate();
    },
  });

  const unfollow = trpc.social.unfollow.useMutation({
    onSuccess: () => {
      utils.social.getUserProfile.invalidate({ userId: id });
      utils.social.following.invalidate();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          Users
        </Link>
        <p className="text-center text-muted-foreground py-12">
          User not found.
        </p>
      </div>
    );
  }

  const initials = (profile.name ?? "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Users
      </Link>

      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <Avatar className="h-16 w-16">
            {profile.avatarUrl && <AvatarImage src={profile.avatarUrl} />}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold truncate">
              {profile.name ?? "Unknown"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Joined{" "}
              {new Date(profile.createdAt).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          {!profile.isOwnProfile && (
            <Button
              variant={profile.isFollowing ? "outline" : "default"}
              size="sm"
              className="shrink-0"
              disabled={follow.isPending || unfollow.isPending}
              onClick={() =>
                profile.isFollowing
                  ? unfollow.mutate({ userId: id })
                  : follow.mutate({ userId: id })
              }
            >
              {profile.isFollowing ? (
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
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-xl font-semibold">{profile.followerCount}</p>
          <p className="text-xs text-muted-foreground">Followers</p>
        </Card>
        <Card className="p-4 text-center">
          <Users className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-xl font-semibold">{profile.followingCount}</p>
          <p className="text-xs text-muted-foreground">Following</p>
        </Card>
        <Card className="p-4 text-center">
          <Dumbbell className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-1 text-xl font-semibold">{profile.workoutCount}</p>
          <p className="text-xs text-muted-foreground">Workouts</p>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        {profile.recentActivity.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No recent activity.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {profile.recentActivity.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  {getActivityIcon(item.type)}
                  <span className="text-sm text-muted-foreground">
                    {getActivityText(item.type)}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {timeAgo(new Date(item.createdAt))}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
