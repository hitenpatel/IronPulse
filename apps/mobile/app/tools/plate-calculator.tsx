import React, { useMemo, useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  PLATE_SIZES_KG,
  calculatePlates,
  validatePlateCalcInput,
} from "@ironpulse/shared";
import { Button } from "@/components/ui";
import { colors, fonts, radii, spacing, typography } from "@/lib/theme";

// Plate tinting mirrors IPF-standard colours. Lime sits in for the 25kg
// red to keep it on-brand.
const PLATE_TINT: Record<number, string> = {
  25: colors.blue, // lime (stand-in for red)
  20: colors.green, // cobalt
  15: colors.amber,
  10: colors.cyan,
  5: colors.text2,
  2.5: colors.orange,
  1.25: colors.text3,
};

export default function PlateCalculatorScreen() {
  const [targetText, setTargetText] = useState("");
  const [barText, setBarText] = useState("20");
  const [submitted, setSubmitted] = useState(false);

  const target = parseFloat(targetText);
  const bar = parseFloat(barText);

  const err = submitted ? validatePlateCalcInput(target, bar) : null;
  const result = useMemo(() => {
    if (!submitted || err) return null;
    return calculatePlates(target, bar, PLATE_SIZES_KG);
  }, [submitted, err, target, bar]);

  const perBarTotal = result ? result.totalLoaded : null;

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
            label="Target weight (kg)"
            value={targetText}
            onChangeText={(t) => {
              setTargetText(t);
              setSubmitted(false);
            }}
            placeholder="e.g. 142.5"
            testID="plates-target-input"
          />
          <Field
            label="Bar weight (kg)"
            value={barText}
            onChangeText={(t) => {
              setBarText(t);
              setSubmitted(false);
            }}
            placeholder="20"
            testID="plates-bar-input"
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

          <Button variant="primary" onPress={() => setSubmitted(true)} testID="plates-calculate">
            Calculate
          </Button>
        </View>

        {result ? (
          <>
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
              <Text
                style={{
                  color: colors.text3,
                  fontSize: typography.eyebrow.size,
                  fontFamily: fonts.bodySemi,
                  textTransform: "uppercase",
                  letterSpacing: typography.eyebrow.letterSpacing,
                }}
              >
                Per side
              </Text>
              {result.platesPerSide.length === 0 ? (
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: typography.body.size,
                    fontFamily: fonts.bodyRegular,
                  }}
                >
                  No plates needed — the bar alone is enough.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {result.platesPerSide.map(({ size, count }) => (
                    <PlateRow key={size} size={size} count={count} />
                  ))}
                </View>
              )}

              {result.remainder > 0 ? (
                <Text
                  style={{
                    color: colors.amber,
                    fontSize: typography.caption.size,
                    fontFamily: fonts.bodyRegular,
                  }}
                >
                  {result.remainder.toFixed(2)}kg per side couldn&apos;t be loaded with available plates.
                </Text>
              ) : null}

              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.lineSoft,
                  paddingTop: 10,
                  marginTop: 6,
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: typography.caption.size,
                    fontFamily: fonts.bodySemi,
                    textTransform: "uppercase",
                    letterSpacing: typography.eyebrow.letterSpacing,
                  }}
                >
                  Loaded total
                </Text>
                <Text
                  style={{
                    color: colors.blue,
                    fontSize: typography.title.size,
                    fontFamily: fonts.displaySemi,
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {perBarTotal?.toFixed(1)} kg
                </Text>
              </View>
            </View>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function PlateRow({ size, count }: { size: number; count: number }) {
  const tint = PLATE_TINT[size] ?? colors.text3;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 6,
        paddingHorizontal: 2,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 3,
            backgroundColor: tint,
          }}
        />
        <Text
          style={{
            color: colors.text,
            fontSize: typography.body.size,
            fontFamily: fonts.bodyMedium,
            fontVariant: ["tabular-nums"],
          }}
        >
          {size} kg
        </Text>
      </View>
      <Text
        style={{
          color: colors.text,
          fontSize: typography.body.size,
          fontFamily: fonts.displaySemi,
          fontVariant: ["tabular-nums"],
        }}
      >
        × {count}
      </Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  testID,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
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
        keyboardType="decimal-pad"
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
