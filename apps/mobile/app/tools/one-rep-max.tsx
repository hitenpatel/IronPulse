import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ONE_REP_MAX_PERCENTAGES,
  calculateOneRepMax,
  percentageOfMax,
  validateOneRepMaxInput,
} from "@ironpulse/shared";
import { Button } from "@/components/ui";
import { colors, fonts, radii, spacing, typography } from "@/lib/theme";

export default function OneRepMaxScreen() {
  const [weightText, setWeightText] = useState("");
  const [repsText, setRepsText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const weight = parseFloat(weightText);
  const reps = parseInt(repsText, 10);

  const err = submitted ? validateOneRepMaxInput(weight, reps) : null;
  const result = submitted && !err ? calculateOneRepMax(weight, reps) : null;

  const rows = useMemo(() => {
    if (!result) return [];
    return ONE_REP_MAX_PERCENTAGES.map((p) => ({
      pct: p,
      weight: percentageOfMax(result.average, p),
    }));
  }, [result]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, gap: 14 }}>
        <View
          style={{
            backgroundColor: colors.bg1,
            borderRadius: radii.card,
            borderWidth: 1,
            borderColor: colors.line,
            paddingVertical: spacing.cardPaddingY,
            paddingHorizontal: spacing.cardPaddingX,
            gap: 12,
          }}
        >
          <Field
            label="Weight lifted (kg)"
            value={weightText}
            onChangeText={(t) => {
              setWeightText(t);
              setSubmitted(false);
            }}
            keyboardType="decimal-pad"
            placeholder="e.g. 100"
            testID="1rm-weight-input"
          />
          <Field
            label="Reps performed"
            value={repsText}
            onChangeText={(t) => {
              setRepsText(t);
              setSubmitted(false);
            }}
            keyboardType="number-pad"
            placeholder="e.g. 5"
            testID="1rm-reps-input"
          />

          {err ? (
            <Text
              style={{
                color: colors.red,
                fontSize: typography.caption.size,
                fontFamily: fonts.bodyRegular,
              }}
            >
              {err}
            </Text>
          ) : null}

          <Button variant="primary" onPress={() => setSubmitted(true)} testID="1rm-calculate">
            Calculate
          </Button>
        </View>

        {result ? (
          <>
            <ResultCard title="Estimated 1RM (kg)">
              <Row label="Epley" value={result.epley} />
              <Row label="Brzycki" value={result.brzycki} />
              <Row label="Lander" value={result.lander} />
              <Row label="Average" value={result.average} emphasis />
            </ResultCard>

            <ResultCard title="Training loads (% of 1RM)">
              {rows.map(({ pct, weight: w }) => (
                <Row key={pct} label={`${pct}%`} value={w} />
              ))}
            </ResultCard>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType: "decimal-pad" | "number-pad";
  placeholder: string;
  testID?: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text
        style={{
          color: colors.text3,
          fontSize: typography.eyebrow.size,
          fontFamily: fonts.bodySemi,
          textTransform: "uppercase",
          letterSpacing: typography.eyebrow.letterSpacing,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.text4}
        testID={testID}
        style={{
          backgroundColor: colors.bg2,
          borderRadius: radii.button,
          borderWidth: 1,
          borderColor: colors.line,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.text,
          fontSize: typography.body.size,
          fontFamily: fonts.bodyRegular,
        }}
      />
    </View>
  );
}

function ResultCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: colors.bg1,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.line,
        paddingVertical: spacing.cardPaddingY,
        paddingHorizontal: spacing.cardPaddingX,
      }}
    >
      <Text
        style={{
          color: colors.text3,
          fontSize: typography.eyebrow.size,
          fontFamily: fonts.bodySemi,
          textTransform: "uppercase",
          letterSpacing: typography.eyebrow.letterSpacing,
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function Row({ label, value, emphasis }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: emphasis ? colors.text : colors.text3,
          fontSize: typography.body.size,
          fontFamily: emphasis ? fonts.bodySemi : fonts.bodyRegular,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: emphasis ? colors.blue : colors.text,
          fontSize: emphasis ? typography.title.size : typography.body.size,
          fontFamily: fonts.displaySemi,
          fontVariant: ["tabular-nums"],
        }}
      >
        {value.toFixed(1)}
      </Text>
    </View>
  );
}
