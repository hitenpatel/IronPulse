import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { recoveryModalityEnum, type RecoveryModality } from "@zor/shared";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { Button, Chip, ErrorState, TopBar, UppercaseLabel } from "@/components/ui";
import { formatDateOnly, parseDateOnlyInput, toUTCDateOnly } from "@/lib/date-utils";
import { capitalize, humanizeEnumValue, statusTone } from "./labels";
import type { InjurySummary, RecoveryActivitySummary } from "./types";

export interface LogRecoveryActivityValues {
  performedAt: Date;
  modality: RecoveryModality;
  durationMins?: number;
  notes?: string;
}

interface InjuryDetailViewProps {
  injury: InjurySummary | null;
  loading: boolean;
  error: boolean;
  onBack: () => void;
  onRetry: () => void;

  activities: RecoveryActivitySummary[];
  activitiesLoading: boolean;

  loggingActivity: boolean;
  activityError: string | null;
  onLogRecoveryActivity: (values: LogRecoveryActivityValues) => void;

  updatingStatus: boolean;
  onChangeStatus: (status: "recovering" | "resolved") => void;
}

export function InjuryDetailView({
  injury,
  loading,
  error,
  onBack,
  onRetry,
  activities,
  activitiesLoading,
  loggingActivity,
  activityError,
  onLogRecoveryActivity,
  updatingStatus,
  onChangeStatus,
}: InjuryDetailViewProps) {
  if (loading) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.gutter }}>
        <TopBar title="Injury" onBack={onBack} />
        <ActivityIndicator color={colors.text3} style={{ marginVertical: 20 }} />
      </ScrollView>
    );
  }

  if (error || !injury) {
    return (
      <ScrollView contentContainerStyle={{ padding: spacing.gutter }}>
        <TopBar title="Injury" onBack={onBack} />
        <ErrorState onRetry={onRetry} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32 }}>
      <TopBar title={humanizeEnumValue(injury.injuryType)} onBack={onBack} testID="injury-detail-title" />

      <View
        testID="injury-detail-summary"
        style={{
          backgroundColor: colors.bg1,
          borderRadius: radii.card,
          borderWidth: 1,
          borderColor: colors.lineSoft,
          padding: 14,
          gap: 8,
          marginBottom: 14,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Chip tone={statusTone(injury.status)}>{humanizeEnumValue(injury.status)}</Chip>
          <Text style={{ fontSize: 12, color: colors.text3, fontFamily: fonts.bodyMedium }}>
            Severity {injury.severity}/10
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: colors.text2, fontFamily: fonts.bodyRegular }}>
          {injury.bodyParts.map(capitalize).join(", ")}
        </Text>
        <Text style={{ fontSize: 11.5, color: colors.text3, fontFamily: fonts.monoRegular }}>
          Logged {new Date(injury.injuredAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </Text>
        {injury.notes ? (
          <Text style={{ fontSize: 13, color: colors.text2, fontFamily: fonts.bodyRegular, marginTop: 4 }}>
            {injury.notes}
          </Text>
        ) : null}
      </View>

      <View testID="injury-status-control" style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
        {injury.status !== "recovering" ? (
          <Button
            testID="injury-status-recovering"
            variant="default"
            size="sm"
            onPress={() => onChangeStatus("recovering")}
            disabled={updatingStatus}
          >
            Mark recovering
          </Button>
        ) : null}
        {injury.status !== "resolved" ? (
          <Button
            testID="injury-status-resolved"
            variant="default"
            size="sm"
            onPress={() => onChangeStatus("resolved")}
            disabled={updatingStatus}
          >
            Mark resolved
          </Button>
        ) : null}
      </View>

      <UppercaseLabel style={{ marginBottom: 8 }}>Recovery timeline</UppercaseLabel>
      {activitiesLoading ? (
        <ActivityIndicator color={colors.text3} style={{ marginBottom: 16 }} />
      ) : activities.length === 0 ? (
        <Text
          style={{ fontSize: 12.5, color: colors.text3, fontFamily: fonts.bodyRegular, marginBottom: 16 }}
        >
          No recovery activity logged yet.
        </Text>
      ) : (
        <View testID="recovery-timeline" style={{ marginBottom: 16 }}>
          {activities.map((activity) => (
            <View
              key={activity.id}
              testID={`recovery-activity-row-${activity.id}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                backgroundColor: colors.bg1,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                borderRadius: 10,
                padding: 10,
                marginBottom: 6,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 13, color: colors.text, fontFamily: fonts.bodyMedium }}>
                  {humanizeEnumValue(activity.modality)}
                </Text>
                <Text style={{ fontSize: 11, color: colors.text3, fontFamily: fonts.monoRegular, marginTop: 1 }}>
                  {new Date(activity.performedAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                  {activity.durationMins ? ` · ${activity.durationMins}m` : ""}
                </Text>
                {activity.notes ? (
                  <Text style={{ fontSize: 11.5, color: colors.text2, fontFamily: fonts.bodyRegular, marginTop: 2 }}>
                    {activity.notes}
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}

      <LogRecoveryActivityForm
        submitting={loggingActivity}
        errorMessage={activityError}
        onSubmit={onLogRecoveryActivity}
      />
    </ScrollView>
  );
}

function LogRecoveryActivityForm({
  submitting,
  errorMessage,
  onSubmit,
}: {
  submitting: boolean;
  errorMessage: string | null;
  onSubmit: (values: LogRecoveryActivityValues) => void;
}) {
  const [dateText, setDateText] = useState(formatDateOnly(new Date()));
  const [modality, setModality] = useState<RecoveryModality>(recoveryModalityEnum.options[0]);
  const [durationMins, setDurationMins] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit() {
    const parsedDate = parseDateOnlyInput(dateText);
    if (!parsedDate) {
      setLocalError("Enter a valid date (YYYY-MM-DD).");
      return;
    }
    setLocalError(null);
    onSubmit({
      performedAt: toUTCDateOnly(parsedDate),
      modality,
      ...(durationMins !== "" && { durationMins: parseInt(durationMins, 10) }),
      ...(notes.trim() !== "" && { notes: notes.trim() }),
    });
  }

  const displayedError = localError ?? errorMessage;

  return (
    <View
      style={{
        backgroundColor: colors.bg1,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        padding: 14,
        gap: 10,
      }}
    >
      <UppercaseLabel>Log recovery activity</UppercaseLabel>

      {displayedError ? (
        <Text testID="recovery-activity-form-error" style={{ color: colors.red, fontSize: 12, fontFamily: fonts.bodyMedium }}>
          {displayedError}
        </Text>
      ) : null}

      <View>
        <UppercaseLabel style={{ marginBottom: 6 }}>Date</UppercaseLabel>
        <TextInput
          testID="recovery-activity-date"
          style={textInputStyle}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.text4}
          value={dateText}
          onChangeText={setDateText}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View>
        <UppercaseLabel style={{ marginBottom: 6 }}>Modality</UppercaseLabel>
        <View testID="recovery-activity-modality" style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {recoveryModalityEnum.options.map((option) => {
            const active = modality === option;
            return (
              <Pressable
                key={option}
                testID={`recovery-activity-modality-option-${option}`}
                onPress={() => setModality(option)}
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

      <View>
        <UppercaseLabel style={{ marginBottom: 6 }}>Duration (min, optional)</UppercaseLabel>
        <TextInput
          testID="recovery-activity-duration"
          style={textInputStyle}
          placeholder="30"
          placeholderTextColor={colors.text4}
          value={durationMins}
          onChangeText={setDurationMins}
          keyboardType="number-pad"
        />
      </View>

      <View>
        <UppercaseLabel style={{ marginBottom: 6 }}>Notes (optional)</UppercaseLabel>
        <TextInput
          testID="recovery-activity-notes"
          style={[textInputStyle, { minHeight: 60, textAlignVertical: "top" }]}
          placeholder="What did you do…"
          placeholderTextColor={colors.text4}
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      <Button
        testID="recovery-log-activity-submit"
        variant="primary"
        onPress={handleSubmit}
        disabled={submitting}
      >
        {submitting ? "Saving…" : "Log recovery activity"}
      </Button>
    </View>
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
