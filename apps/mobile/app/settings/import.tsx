import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CheckCircle2, Upload } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  muted: theme.bg2,
  border: theme.line,
  foreground: theme.text,
  mutedFg: theme.text3,
  dimFg: theme.text4,
  primary: theme.green,
  success: theme.blue, // lime success in v2
  error: theme.red,
};

type ImportResult = { workoutsImported: number; setsImported: number; exercisesCreated: number };

export default function ImportScreen() {
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleImport() {
    const trimmed = csvText.trim();
    if (!trimmed) {
      Alert.alert("Empty CSV", "Please paste your CSV data before importing.");
      return;
    }

    setImporting(true);
    setResult(null);
    setError(null);

    try {
      const res = await trpc.import.importWorkouts.mutate({ csv: trimmed });
      setResult(res);
      setCsvText("");
    } catch (err: any) {
      setError(err?.message ?? "Import failed. Please check your CSV format.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>

        {/* Supported formats */}
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
          <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
            Supported Formats
          </Text>
          {[
            { app: "Strong", desc: "Export from Strong → CSV" },
            { app: "Hevy", desc: "Export from Hevy → CSV" },
            { app: "FitNotes", desc: "Export from FitNotes → CSV" },
          ].map(({ app, desc }) => (
            <View key={app} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <CheckCircle2 size={14} color={colors.success} />
              <View>
                <Text style={{ color: colors.foreground, fontSize: 13, fontWeight: "500" }}>{app}</Text>
                <Text style={{ color: colors.dimFg, fontSize: 11 }}>{desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* CSV paste area */}
        <View style={{ gap: 8 }}>
          <Text style={{ color: colors.mutedFg, fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
            Paste CSV Data
          </Text>
          <TextInput
            style={{
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 10,
              padding: 12,
              color: colors.foreground,
              fontSize: 12,
              fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }),
              height: 200,
              textAlignVertical: "top",
            }}
            value={csvText}
            onChangeText={(text) => {
              setCsvText(text);
              setResult(null);
              setError(null);
            }}
            multiline
            placeholder={"Date,Workout Name,Exercise Name,Set Order,Weight,Reps,...\n..."}
            placeholderTextColor={colors.dimFg}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={{ color: colors.dimFg, fontSize: 11 }}>
            {csvText.split("\n").length} lines · {csvText.length} chars
          </Text>
        </View>

        {/* Success result */}
        {result && (
          <View
            style={{
              backgroundColor: "#14532D",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.success + "44",
              padding: 16,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={18} color={colors.success} />
              <Text style={{ color: colors.success, fontSize: 15, fontWeight: "700" }}>
                Import Successful
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 16 }}>
              {[
                { label: "Workouts", value: result.workoutsImported },
                { label: "Sets", value: result.setsImported },
                { label: "Exercises", value: result.exercisesCreated },
              ].map(({ label, value }) => (
                <View key={label}>
                  <Text style={{ color: colors.success, fontSize: 20, fontWeight: "700" }}>{value}</Text>
                  <Text style={{ color: colors.success + "99", fontSize: 11 }}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Error */}
        {error && (
          <View
            style={{
              backgroundColor: "#7F1D1D",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.error + "44",
              padding: 14,
            }}
          >
            <Text style={{ color: colors.error, fontSize: 13, lineHeight: 18 }}>{error}</Text>
          </View>
        )}

        {/* Import button */}
        <Pressable
          onPress={handleImport}
          disabled={importing || !csvText.trim()}
          style={{
            backgroundColor: importing || !csvText.trim() ? colors.muted : colors.primary,
            borderRadius: 10,
            height: 50,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
          }}
        >
          {importing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Upload size={18} color="#fff" />
          )}
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
            {importing ? "Importing…" : "Import Workouts"}
          </Text>
        </Pressable>

        <Text style={{ color: colors.dimFg, fontSize: 12, textAlign: "center", lineHeight: 18 }}>
          The format is automatically detected from your CSV.{"\n"}Duplicate workouts are skipped.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

