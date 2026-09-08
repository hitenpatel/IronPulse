import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { injuryTypeEnum, type InjuryType } from "@zor/shared";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { Button, Chip, TopBar, UppercaseLabel } from "@/components/ui";
import { formatDateOnly, parseDateOnlyInput, toUTCDateOnly } from "@/lib/date-utils";
import { humanizeEnumValue } from "./labels";

export interface LogInjuryFormValues {
  injuredAt: Date;
  injuryType: InjuryType;
  severity: number;
  bodyParts: string[];
  notes?: string;
}

interface LogInjuryFormProps {
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: LogInjuryFormValues) => void;
  onCancel: () => void;
}

const SEVERITY_SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

export function LogInjuryForm({ submitting, errorMessage, onSubmit, onCancel }: LogInjuryFormProps) {
  const [dateText, setDateText] = useState(formatDateOnly(new Date()));
  const [injuryType, setInjuryType] = useState<InjuryType>(injuryTypeEnum.options[0]);
  const [severity, setSeverity] = useState(5);
  const [bodyPartInput, setBodyPartInput] = useState("");
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleAddBodyPart() {
    const value = bodyPartInput.trim().toLowerCase();
    if (!value) return;
    if (!bodyParts.includes(value)) {
      setBodyParts((prev) => [...prev, value]);
    }
    setBodyPartInput("");
  }

  function handleRemoveBodyPart(part: string) {
    setBodyParts((prev) => prev.filter((p) => p !== part));
  }

  function handleSubmit() {
    const parsedDate = parseDateOnlyInput(dateText);
    if (!parsedDate) {
      setLocalError("Enter a valid date (YYYY-MM-DD).");
      return;
    }
    if (bodyParts.length === 0) {
      setLocalError("Add at least one body part.");
      return;
    }
    setLocalError(null);
    onSubmit({
      injuredAt: toUTCDateOnly(parsedDate),
      injuryType,
      severity,
      bodyParts,
      ...(notes.trim() !== "" && { notes: notes.trim() }),
    });
  }

  const displayedError = localError ?? errorMessage;

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32 }}>
      <TopBar title="Log injury" onBack={onCancel} />

      {displayedError ? (
        <Text
          testID="injury-form-error"
          style={{
            color: colors.red,
            fontSize: 12.5,
            marginBottom: 10,
            fontFamily: fonts.bodyMedium,
          }}
        >
          {displayedError}
        </Text>
      ) : null}

      <View style={{ marginBottom: 12 }}>
        <UppercaseLabel style={{ marginBottom: 6 }}>Date</UppercaseLabel>
        <TextInput
          testID="injury-date-input"
          style={textInputStyle}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.text4}
          value={dateText}
          onChangeText={setDateText}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={{ marginBottom: 12 }}>
        <UppercaseLabel style={{ marginBottom: 6 }}>Injury type</UppercaseLabel>
        <View testID="injury-type-picker" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {injuryTypeEnum.options.map((option) => {
            const active = injuryType === option;
            return (
              <Pressable
                key={option}
                testID={`injury-type-option-${option}`}
                onPress={() => setInjuryType(option)}
                accessibilityRole="button"
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: radii.buttonSm,
                  borderWidth: 1,
                  borderColor: active ? colors.blue : colors.line,
                  backgroundColor: active ? colors.blueSoft : colors.bg2,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: active ? colors.blue2 : colors.text3,
                    fontFamily: fonts.bodyMedium,
                  }}
                >
                  {humanizeEnumValue(option)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <UppercaseLabel style={{ marginBottom: 6 }}>Severity (1-10)</UppercaseLabel>
        <View testID="injury-severity" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {SEVERITY_SCALE.map((n) => {
            const active = severity === n;
            return (
              <Pressable
                key={n}
                testID={`injury-severity-option-${n}`}
                onPress={() => setSeverity(n)}
                accessibilityRole="button"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: active ? colors.amber : colors.line,
                  backgroundColor: active ? colors.amberSoft : colors.bg2,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    color: active ? colors.amber : colors.text3,
                    fontFamily: fonts.bodyMedium,
                  }}
                >
                  {n}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ marginBottom: 12 }}>
        <UppercaseLabel style={{ marginBottom: 6 }}>Body parts</UppercaseLabel>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 8 }}>
          <TextInput
            testID="injury-body-part-input"
            style={[textInputStyle, { flex: 1 }]}
            placeholder="e.g. hamstrings"
            placeholderTextColor={colors.text4}
            value={bodyPartInput}
            onChangeText={setBodyPartInput}
            autoCapitalize="none"
            onSubmitEditing={handleAddBodyPart}
          />
          <Button testID="injury-body-part-add-button" variant="default" onPress={handleAddBodyPart}>
            Add
          </Button>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {bodyParts.map((part) => (
            <Pressable
              key={part}
              testID={`injury-body-part-remove-${part}`}
              onPress={() => handleRemoveBodyPart(part)}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${part}`}
            >
              <Chip tone="purple">{part} ✕</Chip>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <UppercaseLabel style={{ marginBottom: 6 }}>Notes (optional)</UppercaseLabel>
        <TextInput
          testID="injury-notes-input"
          style={[textInputStyle, { minHeight: 70, textAlignVertical: "top" }]}
          placeholder="What happened, how it felt…"
          placeholderTextColor={colors.text4}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <Button
        testID="recovery-log-injury-submit"
        variant="primary"
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Saving…" : "Log injury"}
      </Button>
    </ScrollView>
  );
}

const textInputStyle = {
  backgroundColor: colors.bg2,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radii.button,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: colors.text,
  fontSize: 13,
  fontFamily: fonts.bodyRegular,
} as const;
