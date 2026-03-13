"use client";

import { useRouter } from "next/navigation";
import { ClipboardList, Play, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TemplatesPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    trpc.template.list.useInfiniteQuery(
      { limit: 20 },
      { getNextPageParam: (last) => last.nextCursor }
    );

  const startWorkout = trpc.workout.create.useMutation({
    onSuccess: (result) => {
      router.push(`/workouts/new?workoutId=${result.workout.id}`);
    },
  });

  const deleteTemplate = trpc.template.delete.useMutation({
    onSuccess: () => {
      utils.template.list.invalidate();
    },
  });

  const templates = data?.pages.flatMap((p) => p.data) ?? [];

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Delete template "${name}"? This cannot be undone.`)) {
      deleteTemplate.mutate({ templateId: id });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-3 w-48 animate-pulse rounded bg-muted" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <ClipboardList className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-lg font-medium">No templates yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Complete a workout and save it as a template!
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Templates</h1>
        {/* Template creation is done from workout detail */}
      </div>

      <div className="space-y-3">
        {templates.map((template) => (
          <Card
            key={template.id}
            className="flex items-center gap-4 p-4"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{template.name}</p>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {template._count.templateExercises}{" "}
                  {template._count.templateExercises === 1
                    ? "exercise"
                    : "exercises"}
                </span>
                <span>
                  {new Date(template.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="icon"
                variant="ghost"
                onClick={() =>
                  startWorkout.mutate({ templateId: template.id })
                }
                disabled={startWorkout.isPending}
                aria-label="Start workout from template"
              >
                <Play className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDelete(template.id, template.name)}
                disabled={deleteTemplate.isPending}
                aria-label="Delete template"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </Card>
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
    </div>
  );
}
