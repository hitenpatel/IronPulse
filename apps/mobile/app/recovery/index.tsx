import React, { useCallback, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../../App";

import { trpc } from "@/lib/trpc";
import { colors } from "@/lib/theme";
import { InjuryListView } from "@/components/recovery/injury-list-view";

type InjuryListResult = Awaited<ReturnType<typeof trpc.injury.list.query>>;
type Injury = InjuryListResult["data"][number];

export default function RecoveryScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [bodyPartFilter, setBodyPartFilter] = useState("");

  const load = useCallback(async (filter: string) => {
    setLoading(true);
    setError(false);
    try {
      // `filter` is already lower-cased by InjuryListView's onChange handler
      // before it lands here — the server-side `has` match is case-sensitive
      // (see the body-part vocabulary amendment).
      const result = await trpc.injury.list.query(filter ? { bodyPart: filter } : {});
      setInjuries(result.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(bodyPartFilter);
    }, [load, bodyPartFilter]),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <InjuryListView
        injuries={injuries}
        loading={loading}
        error={error}
        bodyPartFilter={bodyPartFilter}
        onBack={() => navigation.goBack()}
        onChangeBodyPartFilter={setBodyPartFilter}
        onPressInjury={(injury) => navigation.navigate("RecoveryInjuryDetail", { injuryId: injury.id })}
        onPressLogInjury={() => navigation.navigate("RecoveryLogInjury")}
        onRetry={() => load(bodyPartFilter)}
      />
    </SafeAreaView>
  );
}
