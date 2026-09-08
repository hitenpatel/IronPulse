import React, { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { trpc } from "@/lib/trpc";
import { colors } from "@/lib/theme";
import { LogInjuryForm, type LogInjuryFormValues } from "@/components/recovery/log-injury-form";

export default function LogInjuryScreen() {
  const navigation = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(values: LogInjuryFormValues) {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      await trpc.injury.log.mutate(values);
      navigation.goBack();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to log injury.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <LogInjuryForm
        submitting={submitting}
        errorMessage={errorMessage}
        onSubmit={handleSubmit}
        onCancel={() => navigation.goBack()}
      />
    </SafeAreaView>
  );
}
