import { Stack } from "expo-router";

export default function HistoryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
        headerTintColor: "hsl(210, 40%, 98%)",
        contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
      }}
    />
  );
}
