"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

interface PreviewStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

type FileType = "gpx" | "fit";

interface GpxImporterProps {
  onPreview: (filePayload: string, stats: PreviewStats, fileType: FileType) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function GpxImporter({ onPreview }: GpxImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previewGpx = trpc.cardio.previewGpx.useMutation({
    onSuccess: (data, variables) => {
      onPreview(variables.gpxContent, data, "gpx");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const previewFit = trpc.cardio.previewFit.useMutation({
    onSuccess: (data, variables) => {
      const stats: PreviewStats = {
        points: data.points.map((p) => ({
          lat: p.lat,
          lng: p.lng,
          elevation: p.elevation,
          timestamp: new Date(p.timestamp),
        })),
        distanceMeters: data.distanceMeters ?? 0,
        elevationGainM: data.elevationGainM ?? 0,
        durationSeconds: data.durationSeconds,
        startedAt: new Date(data.startedAt),
      };
      onPreview(variables.fileBase64, stats, "fit");
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const isPending = previewGpx.isPending || previewFit.isPending;

  function handleFile(file: File) {
    setError(null);

    const name = file.name.toLowerCase();
    const isGpx = name.endsWith(".gpx");
    const isFit = name.endsWith(".fit");

    if (!isGpx && !isFit) {
      setError("Please select a .gpx or .fit file");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("File is too large (max 10MB)");
      return;
    }

    if (isGpx) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        previewGpx.mutate({ gpxContent: content });
      };
      reader.onerror = () => {
        setError("Failed to read file");
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]!);
        }
        const base64 = btoa(binary);
        previewFit.mutate({ fileBase64: base64 });
      };
      reader.onerror = () => {
        setError("Failed to read file");
      };
      reader.readAsArrayBuffer(file);
    }
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
        accept=".gpx,.fit"
        onChange={handleInputChange}
        className="hidden"
      />

      <button
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        disabled={isPending}
        className={`flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed px-4 py-12 transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-foreground"
        } ${isPending ? "opacity-50" : ""}`}
      >
        {isPending ? (
          <>
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            <span className="text-sm text-muted-foreground">Parsing file...</span>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Drop a .gpx or .fit file, or click to browse
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
