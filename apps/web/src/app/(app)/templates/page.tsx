"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Pencil, Play, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { usePowerSync } from "@powersync/react";
import { useTemplates } from "@ironpulse/sync";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function TemplatesPage() {
  const router = useRouter();
  const db = usePowerSync();

  const { data: templatesData, isLoading } = useTemplates();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const startWorkout = trpc.workout.create.useMutation({
    onSuccess: (result) => {
      router.push(`/workouts/new?workoutId=${result.workout.id}`);
    },
  });

  const templates = templatesData ?? [];

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db.execute("DELETE FROM workout_templates WHERE id = ?", [deleteTarget.id]);
    setDeleteTarget(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display font-semibold text-[28px] text-foreground">Templates</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-card rounded-lg border border-border p-5">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted mb-3" />
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display font-semibold text-[28px] text-foreground">Templates</h1>
        <Button>New Template</Button>
      </div>

      {templates.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            className="bg-card rounded-lg border border-dashed border-border p-5 min-h-[160px] flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors"
            onClick={() => router.push("/templates/new")}
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Create Template</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-card rounded-lg border border-border p-5 hover:bg-muted/30 transition-colors flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <ClipboardList className="h-5 w-5 text-primary" />
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => startWorkout.mutate({ templateId: template.id })}
                    disabled={startWorkout.isPending}
                    aria-label="Start workout from template"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    asChild
                    aria-label="Edit template"
                  >
                    <Link href={`/templates/${template.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteTarget({ id: template.id, name: template.name })}
                    aria-label="Delete template"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display font-medium text-lg text-foreground truncate">
                  {template.name}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {template.exercise_count ?? 0}{" "}
                  {(template.exercise_count ?? 0) === 1 ? "exercise" : "exercises"}
                </p>
              </div>

              {/* Muscle group badges derived from template exercises */}
            </div>
          ))}

          <button
            className="bg-card rounded-lg border border-dashed border-border p-5 min-h-[160px] flex flex-col items-center justify-center gap-2 hover:bg-muted/30 transition-colors"
            onClick={() => router.push("/templates/new")}
          >
            <Plus className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Create Template</span>
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete template"
        description={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}
