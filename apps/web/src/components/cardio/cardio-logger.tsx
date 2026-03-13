"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { TypePicker } from "./type-picker";
import { ManualCardioForm } from "./manual-cardio-form";
import { GpxImporter } from "./gpx-importer";
import { GpxPreview } from "./gpx-preview";
import { CardioSummary } from "./cardio-summary";

interface GpxStats {
  points: { lat: number; lng: number; elevation: number | null; timestamp: Date }[];
  distanceMeters: number;
  elevationGainM: number;
  durationSeconds: number;
  startedAt: Date;
}

type Tab = "manual" | "gpx";
type ManualStep = "type" | "form";
type GpxStep = "upload" | "preview";

export function CardioLogger() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("manual");
  const [manualStep, setManualStep] = useState<ManualStep>("type");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [gpxStep, setGpxStep] = useState<GpxStep>("upload");
  const [gpxPreviewData, setGpxPreviewData] = useState<{
    gpxContent: string;
    stats: GpxStats;
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

  function handleGpxPreview(gpxContent: string, stats: GpxStats) {
    setGpxPreviewData({ gpxContent, stats });
    setGpxStep("preview");
  }

  function handleGpxCancel() {
    setGpxStep("upload");
    setGpxPreviewData(null);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleGpxConfirm(session: any) {
    setCompletedSource("gpx");
    setCompletedSession(session);
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    // Reset sub-steps when switching tabs
    setManualStep("type");
    setSelectedType(null);
    setGpxStep("upload");
    setGpxPreviewData(null);
  }

  // Completion screen
  if (completedSession) {
    return (
      <CardioSummary
        session={completedSession}
        hasRoute={completedSource === "gpx"}
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
          onClick={() => handleTabChange("gpx")}
          className={cn(
            "flex-1 pb-2 text-center text-sm font-medium transition-colors",
            activeTab === "gpx"
              ? "border-b-2 border-foreground text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Import GPX
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

      {/* GPX flow */}
      {activeTab === "gpx" && gpxStep === "upload" && (
        <GpxImporter onPreview={handleGpxPreview} />
      )}
      {activeTab === "gpx" && gpxStep === "preview" && gpxPreviewData && (
        <GpxPreview
          gpxContent={gpxPreviewData.gpxContent}
          stats={gpxPreviewData.stats}
          onConfirm={handleGpxConfirm}
          onCancel={handleGpxCancel}
        />
      )}
    </div>
  );
}
