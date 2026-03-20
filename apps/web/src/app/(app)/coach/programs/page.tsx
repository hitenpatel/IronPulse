"use client";

import { useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, Plus, Crown, ArrowLeft } from "lucide-react";

export default function CoachProgramsPage() {
  const { data: userData, isLoading: userLoading } = trpc.user.me.useQuery();
  const user = userData?.user;

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[100px] animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!user || user.tier !== "coach") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Crown className="mx-auto h-12 w-12 text-pr-gold" />
          <h1 className="font-display text-2xl font-bold text-foreground">Coach Feature</h1>
          <p className="text-muted-foreground">
            Upgrade to the Coach tier to build programs.
          </p>
          <Button asChild>
            <Link href="/settings/integrations">View Pricing</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ProgramList />;
}

function ProgramList() {
  const utils = trpc.useUtils();
  const { data: programs, isLoading } = trpc.program.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("4");

  const createProgram = trpc.program.create.useMutation({
    onSuccess: () => {
      setName("");
      setDescription("");
      setDurationWeeks("4");
      setShowForm(false);
      utils.program.list.invalidate();
    },
  });

  function handleCreate() {
    if (!name.trim()) return;
    createProgram.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      durationWeeks: parseInt(durationWeeks, 10) || 4,
      schedule: {},
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/coach"
            className="rounded-md p-1 hover:bg-muted transition-colors text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">Programs</h1>
        </div>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-card rounded-lg border border-border p-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prog-name">Program Name</Label>
            <Input
              id="prog-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Strength Block A"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-desc">Description (optional)</Label>
            <Input
              id="prog-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="prog-weeks">Duration (weeks)</Label>
            <Input
              id="prog-weeks"
              type="number"
              min={1}
              max={52}
              value={durationWeeks}
              onChange={(e) => setDurationWeeks(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || createProgram.isPending}
            >
              {createProgram.isPending ? "Creating..." : "Create Program"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Program List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-[100px] animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !programs || programs.length === 0 ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <div className="text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-lg font-medium text-foreground">No programs yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first training program above.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-lg border border-border overflow-hidden">
          {programs.map((program) => (
            <Link key={program.id} href={`/coach/programs/${program.id}`}>
              <div className="p-4 border-b border-border last:border-0 transition-colors hover:bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-foreground">{program.name}</p>
                    {program.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {program.description}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                      {program.durationWeeks}w
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {program.assignmentCount} athlete
                      {program.assignmentCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
