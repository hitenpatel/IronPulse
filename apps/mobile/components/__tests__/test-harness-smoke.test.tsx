import React from "react";
import { Pressable, Text } from "react-native";
import { render, screen, fireEvent } from "@testing-library/react-native";

/**
 * Smoke fixture proving the RN Testing Library harness can render a
 * Pressable, find it by accessibility role + name, and dispatch a press.
 * Product component tests depend on all three working.
 */
function CompleteSetButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Complete set" onPress={onPress}>
      <Text>Complete set</Text>
    </Pressable>
  );
}

describe("component test harness", () => {
  it("renders, queries by role/name, and dispatches press events", async () => {
    const onPress = jest.fn();
    await render(<CompleteSetButton onPress={onPress} />);

    const button = screen.getByRole("button", { name: "Complete set" });
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
