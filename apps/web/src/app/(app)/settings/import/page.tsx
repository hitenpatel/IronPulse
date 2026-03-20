"use client";

import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type DetectedFormat = "strong" | "hevy" | "fitnotes" | "unknown" | null;

interface PreviewRow {
  [key: string]: string;
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function detectFormat(csv: string): DetectedFormat {
  const header = csv.split("\n")[0]?.toLowerCase() ?? "";
  if (header.includes("workout name") && header.includes("set order"))
    return "strong";
  if (header.includes("exercise_title") && header.includes("set_type"))
    return "hevy";
  if (header.includes("category") && header.includes("distance unit"))
    return "fitnotes";
  return "unknown";
}

function parsePreview(csv: string): { headers: string[]; rows: PreviewRow[] } {
  const lines = csv
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]!);
  const rows: PreviewRow[] = [];

  for (let i = 1; i <= Math.min(5, lines.length - 1); i++) {
    const cols = parseCSVLine(lines[i]!);
    const row: PreviewRow = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

const FORMAT_LABELS: Record<NonNullable<DetectedFormat>, string> = {
  strong: "Strong",
  hevy: "Hevy",
  fitnotes: "FitNotes",
  unknown: "Unknown",
};

const FORMAT_BADGE_VARIANTS: Record<
  NonNullable<DetectedFormat>,
  "default" | "secondary" | "destructive" | "outline"
> = {
  strong: "default",
  hevy: "default",
  fitnotes: "default",
  unknown: "destructive",
};

export default function ImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvContent, setCsvContent] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<DetectedFormat>(null);
  const [preview, setPreview] = useState<{
    headers: string[];
    rows: PreviewRow[];
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const importMutation = trpc.import.importWorkouts.useMutation();

  function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setCsvContent(text);
      setDetectedFormat(detectFormat(text));
      setPreview(parsePreview(text));
      importMutation.reset();
    };
    reader.readAsText(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleImport() {
    if (!csvContent) return;
    importMutation.mutate({ csv: csvContent });
  }

  const isSuccess = importMutation.isSuccess;
  const result = importMutation.data;
  const canImport =
    csvContent !== null &&
    detectedFormat !== null &&
    detectedFormat !== "unknown" &&
    !importMutation.isPending &&
    !isSuccess;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Import Workouts</h1>

      {/* Upload Card */}
      <div className="bg-card rounded-lg border border-border p-5">
        <h2 className="font-semibold text-foreground mb-1">Upload CSV File</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Import workouts from Strong, Hevy, or FitNotes. Export a CSV from
          your app and upload it here — your workout history will be added to
          IronPulse automatically.
        </p>
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload CSV file"
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30"
            )}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">
                {fileName ? fileName : "Drop your CSV here or click to browse"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports Strong, Hevy, and FitNotes exports
              </p>
            </div>
            {fileName && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-3.5 w-3.5" />
                {fileName}
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Detected format */}
          {detectedFormat !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Detected format:
              </span>
              <Badge variant={FORMAT_BADGE_VARIANTS[detectedFormat]}>
                {FORMAT_LABELS[detectedFormat]}
              </Badge>
              {detectedFormat === "unknown" && (
                <span className="text-xs text-destructive">
                  Could not detect format. Check that the file is a valid
                  Strong, Hevy, or FitNotes export.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Preview table */}
      {preview && preview.headers.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-5">
          <h2 className="font-semibold text-foreground mb-1">Preview</h2>
          <p className="text-sm text-muted-foreground mb-4">First 5 rows of your CSV file.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {preview.headers.map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 even:bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    {preview.headers.map((h) => (
                      <td
                        key={h}
                        className="max-w-[200px] truncate whitespace-nowrap px-3 py-2 text-foreground"
                        title={row[h]}
                      >
                        {row[h]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import action */}
      {csvContent !== null && (
        <div className="bg-card rounded-lg border border-border p-5">
          {isSuccess && result ? (
            <div className="flex items-start gap-3 rounded-lg bg-success/10 p-4 text-success">
              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">Import complete!</p>
                <ul className="text-sm space-y-0.5">
                  <li>{result.workoutsImported} workouts imported</li>
                  <li>{result.setsImported} sets imported</li>
                  {result.exercisesCreated > 0 && (
                    <li>{result.exercisesCreated} new exercises created</li>
                  )}
                </ul>
              </div>
            </div>
          ) : importMutation.isError ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-destructive/10 p-4 text-destructive">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-medium">Import failed</p>
                  <p className="text-sm">
                    {importMutation.error.message}
                  </p>
                </div>
              </div>
              <Button onClick={handleImport} disabled={!canImport}>
                Retry Import
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Ready to import your workout history.
              </p>
              <Button onClick={handleImport} disabled={!canImport}>
                {importMutation.isPending ? "Importing…" : "Import Workouts"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
