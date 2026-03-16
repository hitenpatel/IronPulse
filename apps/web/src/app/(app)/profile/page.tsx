"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "next-auth/react";
import { User, Settings, LogOut, Check, Link2, Users, Download } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.user.me.useQuery();
  const { data: followersData } = trpc.social.followers.useQuery();
  const { data: followingData } = trpc.social.following.useQuery();
  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate();
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    },
  });

  const [name, setName] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );

  const user = data?.user;

  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="space-y-4">
          <div className="h-[200px] animate-pulse rounded-xl bg-muted" />
          <div className="h-[160px] animate-pulse rounded-xl bg-muted" />
          <div className="h-[80px] animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const nameChanged = name.trim() !== (user.name ?? "");

  function handleSaveName() {
    if (!nameChanged) return;
    setSaveStatus("saving");
    updateProfile.mutate({ name: name.trim() });
  }

  function handleUnitToggle(unitSystem: "metric" | "imperial") {
    if (unitSystem === user!.unitSystem) return;
    setSaveStatus("saving");
    updateProfile.mutate({ unitSystem });
  }

  const memberSince = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Profile</h1>

      {/* User Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <div className="flex gap-2">
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Button
                size="sm"
                disabled={!nameChanged || updateProfile.isPending}
                onClick={handleSaveName}
                className="shrink-0"
              >
                {saveStatus === "saved" ? (
                  <>
                    <Check className="h-4 w-4" />
                    Saved!
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Email</Label>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Tier</span>
            <span className="font-medium capitalize">{user.tier}</span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">{memberSince}</span>
          </div>
        </CardContent>
      </Card>

      {/* Social Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5" />
            <h3 className="font-semibold">Social</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">
                {followersData?.followers.length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Followers</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {followingData?.following.length ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Following</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Unit System</Label>
            <div className="flex gap-2">
              <Button
                variant={
                  user.unitSystem === "metric" ? "default" : "outline"
                }
                size="sm"
                onClick={() => handleUnitToggle("metric")}
                disabled={updateProfile.isPending}
              >
                Metric (kg/km)
              </Button>
              <Button
                variant={
                  user.unitSystem === "imperial" ? "default" : "outline"
                }
                size="sm"
                onClick={() => handleUnitToggle("imperial")}
                disabled={updateProfile.isPending}
              >
                Imperial (lb/mi)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <ExportButton label="Export Workouts (CSV)" mutationKey="workouts" format="csv" />
          <ExportButton label="Export Cardio (CSV)" mutationKey="cardio" format="csv" />
          <ExportButton label="Export All (JSON)" mutationKey="allData" format="json" />
        </CardContent>
      </Card>

      {/* Connected Apps */}
      <Card>
        <CardContent className="pt-6">
          <Button variant="outline" className="w-full" asChild>
            <Link href="/settings/integrations">
              <Link2 className="h-4 w-4" />
              Connected Apps
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportButton({
  label,
  mutationKey,
  format,
}: {
  label: string;
  mutationKey: "workouts" | "cardio" | "allData";
  format: "csv" | "json";
}) {
  const mutation =
    mutationKey === "allData"
      ? trpc.export.allData.useMutation()
      : mutationKey === "workouts"
        ? trpc.export.workouts.useMutation()
        : trpc.export.cardio.useMutation();

  function handleExport() {
    const input = mutationKey === "allData" ? undefined : { format };
    (mutation.mutate as any)(input, {
      onSuccess: (result: { data: string; mimeType: string }) => {
        const blob = new Blob([result.data], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const ext = format === "csv" ? "csv" : "json";
        a.download = `ironpulse-${mutationKey}-${new Date().toISOString().split("T")[0]}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      },
    });
  }

  return (
    <Button
      variant="outline"
      className="w-full justify-start"
      onClick={handleExport}
      disabled={mutation.isPending}
    >
      <Download className="h-4 w-4" />
      {mutation.isPending ? "Exporting..." : label}
    </Button>
  );
}
