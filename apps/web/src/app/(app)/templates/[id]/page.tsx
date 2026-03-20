"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  GripVertical,
  Trash2,
  Plus,
  Search,
  X,
  Dumbbell,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Types ───────────────────────────────────────────────────────────────────

type SetType = "working" | "warmup" | "dropset" | "failure";

interface TemplateSet {
  setNumber: number;
  targetReps: number | undefined;
  targetWeightKg: number | undefined;
  type: SetType;
}

interface TemplateExercise {
  /** client-only key for stable React keys & DnD ids */
  _key: string;
  exerciseId: string;
  exerciseName: string;
  order: number;
  notes: string | undefined;
  sets: TemplateSet[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function newKey() {
  return crypto.randomUUID();
}

function defaultSet(setNumber: number): TemplateSet {
  return { setNumber, targetReps: undefined, targetWeightKg: undefined, type: "working" };
}

// ─── SortableExerciseRow ─────────────────────────────────────────────────────

interface SortableExerciseRowProps {
  exercise: TemplateExercise;
  index: number;
  onRemoveExercise: (key: string) => void;
  onUpdateSet: (key: string, setIndex: number, patch: Partial<TemplateSet>) => void;
  onAddSet: (key: string) => void;
  onRemoveSet: (key: string, setIndex: number) => void;
}

function SortableExerciseRow({
  exercise,
  index,
  onRemoveExercise,
  onUpdateSet,
  onAddSet,
  onRemoveSet,
}: SortableExerciseRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: exercise._key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="p-4">
        {/* Exercise header */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-5 w-5" />
          </button>

          <div className="flex-1 min-w-0">
            <span className="text-xs text-muted-foreground font-medium">
              {index + 1}.
            </span>{" "}
            <span className="font-medium">{exercise.exerciseName}</span>
          </div>

          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => onRemoveExercise(exercise._key)}
            aria-label={`Remove ${exercise.exerciseName}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {/* Sets table */}
        <div className="mt-3 space-y-2">
          {/* Header row */}
          {exercise.sets.length > 0 && (
            <div className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] gap-2 px-1 text-xs font-medium text-muted-foreground">
              <span>#</span>
              <span>Reps</span>
              <span>Weight (kg)</span>
              <span>Type</span>
              <span />
            </div>
          )}

          {exercise.sets.map((set, si) => (
            <div
              key={si}
              className="grid grid-cols-[2rem_1fr_1fr_1fr_2rem] items-center gap-2"
            >
              <span className="text-sm text-muted-foreground text-center">
                {set.setNumber}
              </span>
              <Input
                type="number"
                min={0}
                placeholder="—"
                value={set.targetReps ?? ""}
                onChange={(e) =>
                  onUpdateSet(exercise._key, si, {
                    targetReps: e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                className="h-8 text-sm"
              />
              <Input
                type="number"
                min={0}
                step={0.5}
                placeholder="—"
                value={set.targetWeightKg ?? ""}
                onChange={(e) =>
                  onUpdateSet(exercise._key, si, {
                    targetWeightKg:
                      e.target.value === "" ? undefined : Number(e.target.value),
                  })
                }
                className="h-8 text-sm"
              />
              <select
                value={set.type}
                onChange={(e) =>
                  onUpdateSet(exercise._key, si, { type: e.target.value as SetType })
                }
                className="h-8 rounded-md border border-input bg-transparent px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="working">Working</option>
                <option value="warmup">Warmup</option>
                <option value="dropset">Dropset</option>
                <option value="failure">Failure</option>
              </select>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => onRemoveSet(exercise._key, si)}
                aria-label="Remove set"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1 gap-1.5 text-xs"
            onClick={() => onAddSet(exercise._key)}
          >
            <Plus className="h-3 w-3" />
            Add set
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── ExercisePicker ──────────────────────────────────────────────────────────

interface ExercisePickerProps {
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
}

function ExercisePicker({ onSelect, onClose }: ExercisePickerProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading } = trpc.exercise.list.useQuery(
    { search: search || undefined, limit: 30 },
    { staleTime: 60_000 }
  );

  const exercises = data?.data ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <Card className="flex w-full max-w-md flex-col gap-3 p-4 sm:max-h-[70vh]">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Add exercise</h2>
          <Button type="button" size="icon" variant="ghost" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search exercises..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 max-h-[50vh]">
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          )}

          {!isLoading && exercises.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Dumbbell className="h-8 w-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">No exercises found</p>
            </div>
          )}

          {exercises.map((ex) => (
            <button
              key={ex.id}
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
              onClick={() => {
                onSelect(ex.id, ex.name);
                onClose();
              }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <Dumbbell className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-sm">{ex.name}</p>
                {ex.equipment && (
                  <p className="text-xs text-muted-foreground capitalize">
                    {ex.equipment.replace("_", " ")}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function TemplateEditPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = params.id;

  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<TemplateExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Load template ──────────────────────────────────────────────────────────

  const { data, isLoading, error } = trpc.template.getById.useQuery(
    { templateId },
    { staleTime: 30_000 }
  );

  useEffect(() => {
    if (!data) return;
    setName(data.template.name);
    setExercises(
      data.template.templateExercises.map((te) => ({
        _key: newKey(),
        exerciseId: te.exercise.id,
        exerciseName: te.exercise.name,
        order: te.order,
        notes: te.notes ?? undefined,
        sets: te.templateSets.map((s) => ({
          setNumber: s.setNumber,
          targetReps: s.targetReps ?? undefined,
          targetWeightKg: s.targetWeightKg != null ? Number(s.targetWeightKg) : undefined,
          type: (s.type as SetType) ?? "working",
        })),
      }))
    );
  }, [data]);

  // ── Save mutation ──────────────────────────────────────────────────────────

  const utils = trpc.useUtils();

  const updateTemplate = trpc.template.update.useMutation({
    onSuccess: () => {
      utils.template.getById.invalidate({ templateId });
      router.push("/templates");
    },
    onError: (err) => {
      setSaveError(err.message);
    },
  });

  // ── DnD sensors ───────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setExercises((prev) => {
      const oldIndex = prev.findIndex((e) => e._key === active.id);
      const newIndex = prev.findIndex((e) => e._key === over.id);
      return arrayMove(prev, oldIndex, newIndex).map((e, i) => ({ ...e, order: i }));
    });
  }, []);

  // ── Exercise mutations ────────────────────────────────────────────────────

  const handleAddExercise = useCallback((exerciseId: string, exerciseName: string) => {
    setExercises((prev) => [
      ...prev,
      {
        _key: newKey(),
        exerciseId,
        exerciseName,
        order: prev.length,
        notes: undefined,
        sets: [defaultSet(1)],
      },
    ]);
  }, []);

  const handleRemoveExercise = useCallback((key: string) => {
    setExercises((prev) =>
      prev.filter((e) => e._key !== key).map((e, i) => ({ ...e, order: i }))
    );
  }, []);

  const handleUpdateSet = useCallback(
    (key: string, setIndex: number, patch: Partial<TemplateSet>) => {
      setExercises((prev) =>
        prev.map((e) => {
          if (e._key !== key) return e;
          const sets = e.sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s));
          return { ...e, sets };
        })
      );
    },
    []
  );

  const handleAddSet = useCallback((key: string) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e._key !== key) return e;
        return {
          ...e,
          sets: [...e.sets, defaultSet(e.sets.length + 1)],
        };
      })
    );
  }, []);

  const handleRemoveSet = useCallback((key: string, setIndex: number) => {
    setExercises((prev) =>
      prev.map((e) => {
        if (e._key !== key) return e;
        const sets = e.sets
          .filter((_, i) => i !== setIndex)
          .map((s, i) => ({ ...s, setNumber: i + 1 }));
        return { ...e, sets };
      })
    );
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    setSaveError(null);
    updateTemplate.mutate({
      templateId,
      name: name.trim() || undefined,
      exercises: exercises.map((e) => ({
        exerciseId: e.exerciseId,
        order: e.order,
        notes: e.notes,
        sets: e.sets.map((s) => ({
          setNumber: s.setNumber,
          targetReps: s.targetReps,
          targetWeightKg: s.targetWeightKg,
          type: s.type,
        })),
      })),
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
        <p className="text-lg font-medium">Template not found</p>
        <Link href="/templates" className="mt-3 text-sm text-primary hover:underline">
          Back to templates
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/templates"
          className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-accent"
          aria-label="Back to templates"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-2xl font-bold">Edit Template</h1>
      </div>

      {/* Template name */}
      <div className="space-y-1.5">
        <label htmlFor="template-name" className="text-sm font-medium">
          Template name
        </label>
        <Input
          id="template-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Push Day A"
          className="text-base"
        />
      </div>

      {/* Exercise list */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Exercises</p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={exercises.map((e) => e._key)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <SortableExerciseRow
                  key={exercise._key}
                  exercise={exercise}
                  index={index}
                  onRemoveExercise={handleRemoveExercise}
                  onUpdateSet={handleUpdateSet}
                  onAddSet={handleAddSet}
                  onRemoveSet={handleRemoveSet}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {exercises.length === 0 && (
          <div className="flex min-h-[10rem] items-center justify-center rounded-xl border border-dashed">
            <p className="text-sm text-muted-foreground">No exercises yet</p>
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          className="w-full gap-2"
          onClick={() => setShowPicker(true)}
        >
          <Plus className="h-4 w-4" />
          Add exercise
        </Button>
      </div>

      {/* Error */}
      {saveError && (
        <p className="text-sm text-destructive">{saveError}</p>
      )}

      {/* Save */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.push("/templates")}
          disabled={updateTemplate.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          className="flex-1"
          onClick={handleSave}
          disabled={updateTemplate.isPending || !name.trim()}
        >
          {updateTemplate.isPending ? "Saving…" : "Save changes"}
        </Button>
      </div>

      {/* Exercise picker modal */}
      {showPicker && (
        <ExercisePicker
          onSelect={handleAddExercise}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
