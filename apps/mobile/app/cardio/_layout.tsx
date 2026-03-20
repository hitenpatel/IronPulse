import { Stack } from "expo-router";

export default function CardioLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#060B14" },
      }}
    />
  );
}
