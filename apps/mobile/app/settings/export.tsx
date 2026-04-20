import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Download, FileText } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  border: "#1E2B47",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  primary: "#0077FF",
};

type ExportType = "workouts" | "cardio" | "bodyMetrics" | "allData";
type Format = "json" | "csv";

const EXPORTS: { key: ExportType; label: string; description: string; supportsCsv: boolean }[] = [
  {
    key: "workouts",
    label: "Workout History",
    description: "All workout sessions with exercises and sets",
    supportsCsv: true,
  },
  {
    key: "cardio",
    label: "Cardio Sessions",
    description: "Running, cycling and other cardio activities",
    supportsCsv: true,
  },
  {
    key: "bodyMetrics",
    label: "Body Metrics",
    description: "Weight, body fat, and measurements",
    supportsCsv: true,
  },
  {
    key: "allData",
    label: "All Data",
    description: "Complete export of all your IronPulse data",
    supportsCsv: false,
  },
];

export default function ExportScreen() {
  const [exporting, setExporting] = useState<string | null>(null);
  const [format, setFormat] = useState<Format>("csv");

  async function handleExport(type: ExportType) {
    setExporting(type);
    try {
      let result: { data: string; mimeType: string };

      switch (type) {
        case "workouts":
          result = await trpc.export.workouts.mutate({ format });
          break;
        case "cardio":
          result = await trpc.export.cardio.mutate({ format });
          break;
        case "bodyMetrics":
          result = await trpc.export.bodyMetrics.mutate({ format });
          break;
        case "allData":
          result = await trpc.export.allData.mutate();
          break;
      }

      const ext = format === "json" || type === "allData" ? "json" : "csv";
      const filename = `ironpulse-${type}-${new Date().toISOString().split("T")[0]}.${ext}`;

      await Share.share({
        message: result.data,
        title: filename,
      });
    } catch (err: any) {
      Alert.alert("Export Failed", err?.message ?? "Please try again.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Format selector */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            padding: 16,
            gap: 10,
          }}
        >
          <Text style={{ color: colors.mutedFg, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Export Format
          </Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {(["csv", "json"] as Format[]).map((f) => (
              <Pressable
                key={f}
                onPress={() => setFormat(f)}
                style={{
                  flex: 1,
                  backgroundColor: format === f ? colors.primary : colors.accent,
                  borderWidth: 1,
                  borderColor: format === f ? colors.primary : colors.border,
                  borderRadius: 8,
                  paddingVertical: 10,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: format === f ? "#fff" : colors.mutedFg, fontWeight: "600", fontSize: 14, textTransform: "uppercase" }}>
                  {f}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ color: colors.dimFg, fontSize: 12 }}>
            {format === "csv" ? "Spreadsheet-compatible format" : "Machine-readable JSON format"}
          </Text>
        </View>

        {/* Export options */}
        <Text style={{ color: colors.foreground, fontSize: 16, fontWeight: "700" }}>Export Data</Text>

        {EXPORTS.map((exp) => {
          const isExporting = exporting === exp.key;
          const disabled = !!exporting;
          const effectiveFormat = exp.supportsCsv ? format : "json";

          return (
            <Pressable
              key={exp.key}
              onPress={() => handleExport(exp.key)}
              disabled={disabled}
              style={{
                backgroundColor: colors.card,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                opacity: disabled && !isExporting ? 0.5 : 1,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  backgroundColor: colors.accent,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isExporting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <FileText size={20} color={colors.primary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.foreground, fontSize: 15, fontWeight: "600" }}>
                  {exp.label}
                </Text>
                <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}>
                  {exp.description}
                </Text>
                {!exp.supportsCsv && format === "csv" && (
                  <Text style={{ color: colors.dimFg, fontSize: 11, marginTop: 2 }}>
                    JSON only
                  </Text>
                )}
              </View>
              <Download size={18} color={isExporting ? colors.primary : colors.dimFg} />
            </Pressable>
          );
        })}

        <Text style={{ color: colors.dimFg, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
          Exported files are shared via your device's share sheet.{"\n"}Save to Files, email, or your preferred cloud storage.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
