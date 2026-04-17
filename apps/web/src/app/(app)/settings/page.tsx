"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bell, Upload } from "lucide-react";

export default function SettingsPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: meData, isLoading } = trpc.user.me.useQuery();
  const user = meData?.user;

  const requestDeletion = trpc.user.requestDeletion.useMutation({
    onSuccess: () => {
      setConfirmOpen(false);
      utils.user.me.invalidate();
    },
  });

  const cancelDeletion = trpc.user.cancelDeletion.useMutation({
    onSuccess: () => {
      utils.user.me.invalidate();
    },
  });

  const updateProfile = trpc.user.updateProfile.useMutation({
    onSuccess: () => utils.user.me.invalidate(),
  });

  const deletionRequestedAt = user?.deletionRequestedAt
    ? new Date(user.deletionRequestedAt)
    : null;

  const deletionDeadline = deletionRequestedAt
    ? new Date(deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Settings</h1>

      {/* Notifications Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Notifications</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Manage what notifications and emails you receive.
        </p>
        <label className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Weekly summary email</p>
            <p className="text-xs text-muted-foreground">
              Send me a weekly training summary via email and push notification
            </p>
          </div>
          <input
            type="checkbox"
            checked={user?.weeklySummaryEnabled ?? true}
            disabled={isLoading || updateProfile.isPending}
            onChange={(e) =>
              updateProfile.mutate({ weeklySummaryEnabled: e.target.checked })
            }
            className="h-5 w-9 appearance-none rounded-full bg-muted checked:bg-primary transition-colors relative cursor-pointer before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
            aria-label="Weekly summary email toggle"
          />
        </label>
      </div>

      {/* Import Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <div className="flex items-center gap-2 mb-1">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-foreground">Import Workouts</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Import your workout history from Strong, Hevy, or FitNotes.
        </p>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Upload a CSV export to bring your existing workout data into IronPulse.
          </p>
          <Button asChild variant="outline">
            <Link href="/settings/import">Go to Import</Link>
          </Button>
        </div>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-card rounded-lg border border-border p-5 border-t-2 border-t-destructive">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <h2 className="font-semibold text-destructive">Danger Zone</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Irreversible actions that affect your account.
        </p>
        {isLoading ? (
          <div className="h-10 animate-pulse rounded-md bg-muted" />
        ) : deletionRequestedAt ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your account is scheduled for deletion on{" "}
              <span className="font-medium text-destructive">
                {deletionDeadline?.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              . All your data will be permanently removed.
            </p>
            <Button
              variant="outline"
              disabled={cancelDeletion.isPending}
              onClick={() => cancelDeletion.mutate()}
            >
              Cancel Deletion
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data.
            </p>
            <Button
              variant="destructive"
              onClick={() => setConfirmOpen(true)}
            >
              Delete Account
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Are you sure? This will delete all your data after 7 days. You can
              cancel the deletion within that period.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={requestDeletion.isPending}
            >
              Keep my account
            </Button>
            <Button
              variant="destructive"
              disabled={requestDeletion.isPending}
              onClick={() => requestDeletion.mutate()}
            >
              {requestDeletion.isPending ? "Requesting…" : "Yes, delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
