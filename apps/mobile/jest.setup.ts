// Reanimated ships a Jest mock that no-ops its worklets.
require("react-native-reanimated/mock");

// Provide stable safe-area insets so components that read them get
// deterministic values instead of undefined during test render.
jest.mock("react-native-safe-area-context", () => {
  const inset = { top: 44, right: 0, bottom: 34, left: 0 };
  const frame = { x: 0, y: 0, width: 390, height: 844 };
  const React = require("react");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
    SafeAreaInsetsContext: { Consumer: ({ children }: any) => children(inset) },
    useSafeAreaInsets: () => inset,
    useSafeAreaFrame: () => frame,
  };
});
