"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Upload } from "lucide-react";

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

  const deletionRequestedAt = user?.deletionRequestedAt
    ? new Date(user.deletionRequestedAt)
    : null;

  const deletionDeadline = deletionRequestedAt
    ? new Date(deletionRequestedAt.getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Workouts
          </CardTitle>
          <CardDescription>
            Import your workout history from Strong, Hevy, or FitNotes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Upload a CSV export to bring your existing workout data into IronPulse.
            </p>
            <Button asChild variant="outline">
              <Link href="/settings/import">Go to Import</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that affect your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
