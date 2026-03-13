"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface GpxStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

interface GpxImporterProps {
  onPreview: (gpxContent: string, stats: GpxStats) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function GpxImporter({ onPreview }: GpxImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewGpx = trpc.cardio.previewGpx.useMutation({
    onSuccess: (data, variables) => {
      onPreview(variables.gpxContent, data);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleFile(file: File) {
    setError(null);

    if (!file.name.toLowerCase().endsWith(".gpx")) {
      setError("Please select a .gpx file");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large (max 10MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      previewGpx.mutate({ gpxContent: content });
    };
    reader.onerror = () => {
      setError("Failed to read file");
    };
    reader.readAsText(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".gpx"
        onChange={handleInputChange}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={previewGpx.isPending}
        className={`flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-12 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground"
        } ${previewGpx.isPending ? "opacity-50" : ""}`}
      >
        {previewGpx.isPending ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <span className="text-sm text-muted-foreground">Parsing GPX file...</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop a .gpx file or click to browse
            </span>
          </>
        )}
      </button>

      {error && (
        <p className="mt-2 text-center text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
