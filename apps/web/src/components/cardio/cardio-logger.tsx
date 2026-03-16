"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TypePicker } from "./type-picker";
import { ManualCardioForm } from "./manual-cardio-form";
import { GpxImporter } from "./gpx-importer";
import { GpxPreview } from "./gpx-preview";
import { CardioSummary } from "./cardio-summary";

interface PreviewStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

type FileType = "gpx" | "fit";
type Tab = "manual" | "import";
type ManualStep = "type" | "form";
type ImportStep = "upload" | "preview";

export function CardioLogger() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("manual");
  const [manualStep, setManualStep] = useState<ManualStep>("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [previewData, setPreviewData] = useState<{
    filePayload: string;
    stats: PreviewStats;
    fileType: FileType;
  } | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [completedSession, setCompletedSession] = useState<any>(null);
  const [completedSource, setCompletedSource] = useState<string>("manual");

  function handleTypeSelected(type: string) {
    setSelectedType(type);
    setManualStep("form");
  }

  function handleManualBack() {
    setManualStep("type");
    setSelectedType(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleManualComplete(session: any) {
    setCompletedSource("manual");
    setCompletedSession(session);
  }

  function handleFilePreview(filePayload: string, stats: PreviewStats, fileType: FileType) {
    setPreviewData({ filePayload, stats, fileType });
    setImportStep("preview");
  }

  function handleImportCancel() {
    setImportStep("upload");
    setPreviewData(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleImportConfirm(session: any) {
    setCompletedSource(previewData?.fileType ?? "gpx");
    setCompletedSession(session);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    // Reset sub-steps when switching tabs
    setManualStep("type");
    setSelectedType(null);
    setImportStep("upload");
    setPreviewData(null);
  }

  // Completion screen
  if (completedSession) {
    return (
      <CardioSummary
        session={completedSession}
        hasRoute={completedSource === "gpx" || completedSource === "fit"}
        onDone={() => router.push("/dashboard")}
      />
    );
  }

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-6 flex border-b border-border">
        <button
          onClick={() => handleTabChange("manual")}
          className={cn(
            "flex-1 pb-2 text-center text-sm font-medium transition-colors",
            activeTab === "manual"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Log Manually
        </button>
        <button
          onClick={() => handleTabChange("import")}
          className={cn(
            "flex-1 pb-2 text-center text-sm font-medium transition-colors",
            activeTab === "import"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Import GPX / FIT
        </button>
      </div>

      {/* Manual flow */}
      {activeTab === "manual" && manualStep === "type" && (
        <TypePicker onSelect={handleTypeSelected} />
      )}
      {activeTab === "manual" && manualStep === "form" && selectedType && (
        <ManualCardioForm
          type={selectedType}
          onBack={handleManualBack}
          onComplete={handleManualComplete}
        />
      )}

      {/* Import flow */}
      {activeTab === "import" && importStep === "upload" && (
        <GpxImporter onPreview={handleFilePreview} />
      )}
      {activeTab === "import" && importStep === "preview" && previewData && (
        <GpxPreview
          gpxContent={previewData.filePayload}
          stats={previewData.stats}
          fileType={previewData.fileType}
          onConfirm={handleImportConfirm}
          onCancel={handleImportCancel}
        />
      )}
    </div>
  );
}
