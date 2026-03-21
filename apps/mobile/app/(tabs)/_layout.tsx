import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, BarChart3, Dumbbell, User, Plus, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Design tokens ───────────────────────────────────────────────
const ACTIVE_COLOR = "#0077FF";
const INACTIVE_COLOR = "#4E6180";
const TAB_BG = "rgba(6, 11, 20, 0.85)";
const TAB_HEIGHT = 64;
const FAB_SIZE = 56;
const ICON_SIZE = 24;
const FAB_ICON_SIZE = 28;
const LABEL_SIZE = 10;

// ─── Tab definitions (minus the center FAB slot) ─────────────────
const LEFT_TABS = [
  { name: "Home", label: "Home", Icon: Home },
  { name: "Stats", label: "Stats", Icon: BarChart3 },
] as const;

const RIGHT_TABS = [
  { name: "Exercises", label: "Exercises", Icon: Dumbbell },
  { name: "Profile", label: "Profile", Icon: User },
] as const;

// ─── Custom Tab Bar (exported for use in App.tsx) ────────────────
export function PulseTabBar({
  state,
  navigation,
  sheetOpen,
  onFabPress,
}: BottomTabBarProps & { sheetOpen: boolean; onFabPress: () => void }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  // Map route name → index in the Tab.Screen order
  const routeNames = state.routes.map((r) => r.name);

  const handleTabPress = (routeName: string, routeIndex: number) => {
    const event = navigation.emit({
      type: "tabPress",
      target: state.routes[routeIndex].key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) {
      navigation.navigate(routeName);
    }
  };

  const renderTabButton = (
    name: string,
    label: string,
    Icon: React.ComponentType<{ size: number; color: string }>,
  ) => {
    const routeIndex = routeNames.indexOf(name);
    const isActive = state.index === routeIndex;
    const color = isActive ? ACTIVE_COLOR : INACTIVE_COLOR;
    const tabTestId = `tab-${name.toLowerCase() === "home" ? "home" : name.toLowerCase()}`;

    return (
      <Pressable
        key={name}
        testID={tabTestId}
        style={styles.tabItem}
        onPress={() => handleTabPress(name, routeIndex)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected: isActive }}
      >
        <Icon size={ICON_SIZE} color={color} />
        {isActive && <View style={styles.activeDot} />}
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={[styles.tabBarWrapper, { paddingBottom: bottomPad }]}>
      {/* Left tabs */}
      <View style={styles.tabGroup}>
        {LEFT_TABS.map(({ name, label, Icon }) => renderTabButton(name, label, Icon))}
      </View>

      {/* Center FAB */}
      <View style={styles.fabContainer}>
        <Pressable
          testID="fab-button"
          style={({ pressed }) => [styles.fab, { opacity: pressed ? 0.85 : 1 }]}
          onPress={onFabPress}
          accessibilityRole="button"
          accessibilityLabel={sheetOpen ? "Close menu" : "New session"}
        >
          {sheetOpen ? (
            <X size={FAB_ICON_SIZE} color="#FFFFFF" strokeWidth={2.5} />
          ) : (
            <Plus size={FAB_ICON_SIZE} color="#FFFFFF" strokeWidth={2.5} />
          )}
        </Pressable>
      </View>

      {/* Right tabs */}
      <View style={styles.tabGroup}>
        {RIGHT_TABS.map(({ name, label, Icon }) => renderTabButton(name, label, Icon))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: TAB_BG,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#1E2B47",
    height: TAB_HEIGHT + 20, // extra room for FAB overflow
    paddingHorizontal: 8,
    // iOS blur approximation via shadow
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },
  tabGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingBottom: 6,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 3,
    paddingVertical: 6,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: ACTIVE_COLOR,
    marginTop: -1,
  },
  tabLabel: {
    fontSize: LABEL_SIZE,
    fontWeight: "500",
    lineHeight: 14,
  },
  fabContainer: {
    width: FAB_SIZE + 16,
    alignItems: "center",
    // Raise FAB above the bar
    marginBottom: 14,
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: ACTIVE_COLOR,
    alignItems: "center",
    justifyContent: "center",
    // Blue glow
    ...Platform.select({
      ios: {
        shadowColor: "#0077FF",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
});
