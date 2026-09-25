import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { prepareOriginStartup } from "@/lib/startup";

type StartupState = "loading" | "ready" | "error";

export function StartupGate({
  children,
  prepare = prepareOriginStartup,
}: {
  children: React.ReactNode;
  prepare?: () => Promise<void>;
}) {
  const [state, setState] = useState<StartupState>("loading");

  const run = useCallback(async () => {
    setState("loading");
    try {
      await prepare();
      setState("ready");
    } catch {
      setState("error");
    }
  }, [prepare]);

  useEffect(() => {
    void run();
  }, [run]);

  if (state === "ready") return children;

  if (state === "error") {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#060B14", padding: 24 }}>
        <Text style={{ color: "#F0F4F8", fontSize: 18, textAlign: "center" }}>
          Zor could not safely prepare local data
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => { void run(); }}
          style={{ marginTop: 20, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: "#D4FF3A", borderRadius: 8 }}
          testID="startup-retry"
        >
          <Text style={{ color: "#060B14", fontWeight: "700" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#060B14" }}>
      <ActivityIndicator color="#F0F4F8" size="large" />
    </View>
  );
}
