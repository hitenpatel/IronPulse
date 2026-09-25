import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { prepareOriginStartup } from "@/lib/startup";
import type { DatabaseMigrationProgress } from "@/lib/database-readiness";

type StartupState = "loading" | "ready" | "error";

async function prepareOriginAsResult<Result>(): Promise<Result> {
  await prepareOriginStartup();
  return undefined as Result;
}

export function StartupGate<Result = void>({
  children,
  prepare,
}: {
  children: React.ReactNode | ((result: Result) => React.ReactNode);
  prepare?: (onProgress: (progress: DatabaseMigrationProgress) => void) => Promise<Result>;
}) {
  const [state, setState] = useState<StartupState>("loading");
  const [result, setResult] = useState<Result | null>(null);
  const [progress, setProgress] = useState<DatabaseMigrationProgress | null>(null);
  const prepareStartup = prepare ?? prepareOriginAsResult<Result>;

  const run = useCallback(async () => {
    setState("loading");
    try {
      const prepared = await prepareStartup(setProgress);
      setResult(prepared);
      setState("ready");
    } catch {
      setState("error");
    }
  }, [prepareStartup]);

  useEffect(() => {
    void run();
  }, [run]);

  if (state === "ready") {
    return typeof children === "function" ? children(result as Result) : children;
  }

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
      {progress ? (
        <Text style={{ color: "#F0F4F8", marginTop: 16 }} testID="startup-progress">
          {progress.phase}: {progress.bytesCopied}/{progress.totalBytes} bytes
        </Text>
      ) : null}
    </View>
  );
}
