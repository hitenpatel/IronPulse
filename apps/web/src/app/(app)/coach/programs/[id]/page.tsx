"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, UserPlus, Crown, X } from "lucide-react";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProgramBuilderPage({ params }: Props) {
  const { id } = use(params);
  const { data: userData, isLoading: userLoading } = trpc.user.me.useQuery();
  const user = userData?.user;

  if (userLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-[400px] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!user || user.tier !== "coach") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center space-y-4 max-w-md">
          <Crown className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-bold">Coach Feature</h1>
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

  return <ProgramBuilder programId={id} />;
}

function ProgramBuilder({ programId }: { programId: string }) {
  const utils = trpc.useUtils();
  const { data: program, isLoading, error } = trpc.program.getById.useQuery({
    id: programId,
  });
  const { data: clients } = trpc.coach.clients.useQuery();
  const { data: templatesData } = trpc.template.list.useQuery({
    limit: 100,
  });

  const templates = templatesData?.data ?? [];

  // Local schedule state: Record<weekNum, Record<dayNum, templateId>>
  const [schedule, setSchedule] = useState<
    Record<string, Record<string, string>>
  >({});
  const [dirty, setDirty] = useState(false);
  const [selectorCell, setSelectorCell] = useState<{
    week: string;
    day: string;
  } | null>(null);
  const [assignAthleteId, setAssignAthleteId] = useState("");
  const [assignDate, setAssignDate] = useState("");

  useEffect(() => {
    if (program?.schedule) {
      // Convert resolved schedule back to simple templateId map
      const simple: Record<string, Record<string, string>> = {};
      for (const [week, days] of Object.entries(program.schedule)) {
        simple[week] = {};
        for (const [day, cell] of Object.entries(
          days as Record<string, { templateId: string; templateName: string | null }>
        )) {
          if (cell.templateId) {
            simple[week][day] = cell.templateId;
          }
        }
      }
      setSchedule(simple);
    }
  }, [program?.schedule]);

  const updateProgram = trpc.program.update.useMutation({
    onSuccess: () => {
      setDirty(false);
      utils.program.getById.invalidate({ id: programId });
    },
  });

  const assignProgram = trpc.program.assign.useMutation({
    onSuccess: () => {
      setAssignAthleteId("");
      setAssignDate("");
      utils.program.getById.invalidate({ id: programId });
    },
  });

  function handleSelectTemplate(templateId: string) {
    if (!selectorCell) return;
    const { week, day } = selectorCell;
    setSchedule((prev) => ({
      ...prev,
      [week]: {
        ...(prev[week] ?? {}),
        [day]: templateId,
      },
    }));
    setDirty(true);
    setSelectorCell(null);
  }

  function handleClearCell(week: string, day: string) {
    setSchedule((prev) => {
      const updated = { ...prev };
      if (updated[week]) {
        const weekCopy = { ...updated[week] };
        delete weekCopy[day];
        updated[week] = weekCopy;
      }
      return updated;
    });
    setDirty(true);
  }

  function handleSave() {
    if (!program) return;
    updateProgram.mutate({
      id: programId,
      name: program.name,
      description: program.description ?? undefined,
      durationWeeks: program.durationWeeks,
      schedule,
    });
  }

  function handleAssign() {
    if (!assignAthleteId || !assignDate) return;
    assignProgram.mutate({
      programId,
      athleteId: assignAthleteId,
      startDate: assignDate,
    });
  }

  function getTemplateName(templateId: string): string {
    // Try resolved schedule first
    if (program?.schedule) {
      for (const days of Object.values(program.schedule)) {
        for (const cell of Object.values(
          days as Record<string, { templateId: string; templateName: string | null }>
        )) {
          if (cell.templateId === templateId && cell.templateName) {
            return cell.templateName;
          }
        }
      }
    }
    // Fallback to template list
    const t = templates.find((t) => t.id === templateId);
    return t?.name ?? "Template";
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-md bg-muted" />
        <div className="h-[400px] animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !program) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href="/coach/programs"
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">Program</h1>
        </div>
        <p className="text-destructive">
          {error?.message ?? "Program not found"}
        </p>
      </div>
    );
  }

  const weeks = Array.from(
    { length: program.durationWeeks },
    (_, i) => i + 1
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/coach/programs"
            className="rounded-md p-1 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{program.name}</h1>
            {program.description && (
              <p className="text-sm text-muted-foreground">
                {program.description}
              </p>
            )}
          </div>
        </div>
        <Button
          onClick={handleSave}
          disabled={!dirty || updateProgram.isPending}
          size="sm"
        >
          <Save className="h-4 w-4" />
          {updateProgram.isPending ? "Saving..." : "Save"}
        </Button>
      </div>

      {/* Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 text-muted-foreground font-medium">
                  Week
                </th>
                {DAY_LABELS.map((d) => (
                  <th
                    key={d}
                    className="text-center p-2 text-muted-foreground font-medium"
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week) => (
                <tr key={week} className="border-t border-border/50">
                  <td className="p-2 font-medium text-muted-foreground">
                    {week}
                  </td>
                  {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                    const templateId = schedule[String(week)]?.[String(day)];
                    const isSelecting =
                      selectorCell?.week === String(week) &&
                      selectorCell?.day === String(day);

                    return (
                      <td key={day} className="p-1 text-center">
                        {isSelecting ? (
                          <div className="relative">
                            <select
                              className="w-full rounded border border-border bg-background px-1 py-1 text-xs"
                              autoFocus
                              value=""
                              onChange={(e) =>
                                handleSelectTemplate(e.target.value)
                              }
                              onBlur={() => setSelectorCell(null)}
                            >
                              <option value="" disabled>
                                Pick...
                              </option>
                              {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : templateId ? (
                          <div className="group relative">
                            <Badge
                              variant="secondary"
                              className="text-xs cursor-pointer max-w-[80px] truncate"
                              title={getTemplateName(templateId)}
                              onClick={() =>
                                setSelectorCell({
                                  week: String(week),
                                  day: String(day),
                                })
                              }
                            >
                              {getTemplateName(templateId)}
                            </Badge>
                            <button
                              className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px]"
                              onClick={() =>
                                handleClearCell(String(week), String(day))
                              }
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            className="h-8 w-8 mx-auto flex items-center justify-center rounded border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                            onClick={() =>
                              setSelectorCell({
                                week: String(week),
                                day: String(day),
                              })
                            }
                          >
                            +
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Assign to Athlete */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4" />
            Assign to Athlete
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {program.assignments && program.assignments.length > 0 && (
            <div className="space-y-2 mb-4">
              <p className="text-xs font-medium text-muted-foreground">
                Current assignments
              </p>
              {program.assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0"
                >
                  <span>
                    {a.athlete.name ?? a.athlete.email}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <select
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={assignAthleteId}
              onChange={(e) => setAssignAthleteId(e.target.value)}
            >
              <option value="">Select athlete...</option>
              {clients?.map((c) => (
                <option key={c.athleteId} value={c.athleteId}>
                  {c.athleteName ?? c.athleteEmail}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={assignDate}
              onChange={(e) => setAssignDate(e.target.value)}
            />
            <Button
              size="sm"
              onClick={handleAssign}
              disabled={
                !assignAthleteId ||
                !assignDate ||
                assignProgram.isPending
              }
            >
              Assign
            </Button>
          </div>
          {assignProgram.error && (
            <p className="text-sm text-destructive">
              {assignProgram.error.message}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
