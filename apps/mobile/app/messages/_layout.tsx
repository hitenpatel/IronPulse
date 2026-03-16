import { Stack } from "expo-router";

export default function MessagesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
        headerTintColor: "hsl(213, 31%, 91%)",
        contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
      }}
    />
  );
}
