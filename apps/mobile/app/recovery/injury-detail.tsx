import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

import { trpc } from "@/lib/trpc";
import { colors } from "@/lib/theme";
import { toUTCDateOnly } from "@/lib/date-utils";
import {
  InjuryDetailView,
  type LogRecoveryActivityValues,
} from "@/components/recovery/injury-detail-view";

type Injury = Awaited<ReturnType<typeof trpc.injury.getById.query>>["injury"];
type RecoveryActivity = Awaited<ReturnType<typeof trpc.injury.listRecovery.query>>["data"][number];

export default function InjuryDetailScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "RecoveryInjuryDetail">>();
  const injuryId = route.params.injuryId;

  const [injury, setInjury] = useState<Injury | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [activities, setActivities] = useState<RecoveryActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  const [loggingActivity, setLoggingActivity] = useState(false);
  const [activityError, setActivityError] = useState<string | null>(null);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setActivitiesLoading(true);
    try {
      const [injuryResult, activityResult] = await Promise.all([
        trpc.injury.getById.query({ id: injuryId }),
        trpc.injury.listRecovery.query({ injuryId }),
      ]);
      setInjury(injuryResult.injury);
      setActivities(activityResult.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setActivitiesLoading(false);
    }
  }, [injuryId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLogRecoveryActivity(values: LogRecoveryActivityValues) {
    setLoggingActivity(true);
    setActivityError(null);
    try {
      await trpc.injury.logRecovery.mutate({ injuryId, ...values });
      await load();
    } catch (err: unknown) {
      setActivityError(err instanceof Error ? err.message : "Failed to log recovery activity.");
    } finally {
      setLoggingActivity(false);
    }
  }

  async function handleChangeStatus(status: "recovering" | "resolved") {
    setUpdatingStatus(true);
    try {
      await trpc.injury.update.mutate({
        id: injuryId,
        status,
        ...(status === "resolved" && { resolvedAt: toUTCDateOnly(new Date()) }),
      });
      await load();
    } catch {
      // The re-render simply keeps the prior status displayed; the user
      // can retry the status change from the same control.
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <InjuryDetailView
        injury={injury}
        loading={loading}
        error={error}
        onBack={() => navigation.goBack()}
        onRetry={load}
        activities={activities}
        activitiesLoading={activitiesLoading}
        loggingActivity={loggingActivity}
        activityError={activityError}
        onLogRecoveryActivity={handleLogRecoveryActivity}
        updatingStatus={updatingStatus}
        onChangeStatus={handleChangeStatus}
      />
    </SafeAreaView>
  );
}
