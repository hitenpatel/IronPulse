import { ActivityIndicator, ScrollView, TextInput, View } from "react-native";
import { HeartPulse, Plus } from "lucide-react-native";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { Button, EmptyState, ErrorState, TopBar, UppercaseLabel } from "@/components/ui";
import { InjuryRow } from "./injury-row";
import type { InjurySummary } from "./types";

interface InjuryListViewProps {
  injuries: InjurySummary[];
  loading: boolean;
  error: boolean;
  bodyPartFilter: string;
  onBack: () => void;
  onChangeBodyPartFilter: (value: string) => void;
  onPressInjury: (injury: InjurySummary) => void;
  onPressLogInjury: () => void;
  onRetry: () => void;
}

export function InjuryListView({
  injuries,
  loading,
  error,
  bodyPartFilter,
  onBack,
  onChangeBodyPartFilter,
  onPressInjury,
  onPressLogInjury,
  onRetry,
}: InjuryListViewProps) {
  return (
    <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32, flexGrow: 1 }}>
      <TopBar
        title="Recovery"
        onBack={onBack}
        right={
          <Button
            testID="recovery-log-injury-button"
            variant="primary"
            size="sm"
            onPress={onPressLogInjury}
            accessibilityLabel="Log injury"
          >
            <Plus size={14} color={colors.blueInk} />
          </Button>
        }
      />

      <View style={{ marginBottom: 10 }}>
        <UppercaseLabel style={{ marginBottom: 6 }}>Filter by body part</UppercaseLabel>
        <TextInput
          testID="recovery-body-part-filter"
          style={{
            backgroundColor: colors.bg2,
            borderWidth: 1,
            borderColor: colors.line,
            borderRadius: radii.button,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: colors.text,
            fontSize: 13,
            fontFamily: fonts.bodyRegular,
          }}
          placeholder="e.g. hamstrings"
          placeholderTextColor={colors.text4}
          value={bodyPartFilter}
          onChangeText={(text) => onChangeBodyPartFilter(text.toLowerCase())}
          autoCapitalize="none"
        />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.text3} style={{ marginVertical: 20 }} />
      ) : error ? (
        <ErrorState onRetry={onRetry} />
      ) : injuries.length === 0 ? (
        <EmptyState
          icon={HeartPulse}
          title="No injuries logged"
          description="Log an injury to start tracking recovery."
          actionLabel="Log injury"
          onAction={onPressLogInjury}
        />
      ) : (
        <View testID="recovery-injury-list">
          {injuries.map((injury) => (
            <InjuryRow key={injury.id} injury={injury} onPress={() => onPressInjury(injury)} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
