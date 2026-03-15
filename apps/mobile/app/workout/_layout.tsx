import { Stack } from "expo-router";

export default function WorkoutLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
        gestureEnabled: false,
      }}
    />
  );
}
