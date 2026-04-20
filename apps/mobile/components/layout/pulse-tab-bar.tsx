import { View, Text, Pressable, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, BarChart3, Dumbbell, User, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, fonts, shadows, typography } from "@/lib/theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Tab bar geometry aligns with iOS HIG (50pt effective bar) and Material 3
// (80dp total). Sizes bumped from v2 handoff for better tap ergonomics + legibility.
const FAB_SIZE = 56;
const FAB_RADIUS = 16;
const ICON_SIZE = 28;
const FAB_ICON_SIZE = 28;

const LEFT_TABS = [
  { name: "Home", label: "Home", Icon: Home },
  { name: "Stats", label: "Stats", Icon: BarChart3 },
] as const;

const RIGHT_TABS = [
  { name: "Exercises", label: "Exercises", Icon: Dumbbell },
  { name: "Profile", label: "Profile", Icon: User },
] as const;

export function PulseTabBar({
  state,
  navigation,
  sheetOpen,
  onFabPress,
}: BottomTabBarProps & { sheetOpen: boolean; onFabPress: () => void }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  // FAB press spring — subtle scale dip for tactile feedback + a rotation
  // when the sheet is open (+ → × feels more connected).
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(sheetOpen ? 1 : 0);
  fabRotation.value = withTiming(sheetOpen ? 1 : 0, { duration: 220 });

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${fabRotation.value * 90}deg` },
    ],
  }));

  const routeNames = state.routes.map((r) => r.name);

  const handleTabPress = (routeName: string, routeIndex: number) => {
    const event = navigation.emit({
      type: "tabPress",
      target: state.routes[routeIndex].key,
      canPreventDefault: true,
    });
    if (!event.defaultPrevented) navigation.navigate(routeName);
  };

  const renderTabButton = (
    name: string,
    label: string,
    Icon: React.ComponentType<{ size: number; color: string }>,
  ) => {
    const routeIndex = routeNames.indexOf(name);
    const isActive = state.index === routeIndex;
    // v2 a11y: inactive tab label uses text-3 (~7:1 on bg) per handoff README,
    // not text-4 which is reserved for decorative labels.
    const iconColor = isActive ? colors.blue : colors.text3;
    const labelColor = isActive ? colors.blue2 : colors.text3;
    const tabTestId = `tab-${name.toLowerCase()}`;

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
        <Icon size={ICON_SIZE} color={iconColor} />
        <Text style={[styles.tabLabel, { color: labelColor }]}>{label}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        <View style={styles.tabGroup}>
          {LEFT_TABS.map(({ name, label, Icon }) => renderTabButton(name, label, Icon))}
        </View>

        <View style={styles.fabSlot}>
          <AnimatedPressable
            testID="fab-button"
            onPressIn={() => {
              fabScale.value = withSpring(0.9, { damping: 14, stiffness: 340 });
            }}
            onPressOut={() => {
              fabScale.value = withSpring(1, { damping: 12, stiffness: 260 });
            }}
            onPress={onFabPress}
            style={[styles.fab, fabAnimatedStyle]}
            accessibilityRole="button"
            accessibilityLabel={sheetOpen ? "Close menu" : "New session"}
          >
            <Plus size={FAB_ICON_SIZE} color={colors.blueInk} strokeWidth={2.5} />
          </AnimatedPressable>
        </View>

        <View style={styles.tabGroup}>
          {RIGHT_TABS.map(({ name, label, Icon }) => renderTabButton(name, label, Icon))}
        </View>
      </View>

      {/* Gesture nav pill — 104×3 bar, 50% opacity text-2 */}
      <View style={[styles.gestureArea, { paddingBottom: bottomPad }]}>
        <View style={styles.gesturePill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "rgba(6,11,20,0.96)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.lineSoft,
  },
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 8,
    paddingHorizontal: 4,
    gap: 0,
    // Min height ≈ iOS HIG effective tab bar (50pt) + label + breathing room.
    minHeight: 68,
  },
  tabGroup: {
    flex: 1,
    flexDirection: "row",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    // 48dp min tap target per WCAG 2.5.5 + Material 3.
    minHeight: 48,
    gap: 4,
  },
  tabLabel: {
    fontSize: typography.tabLabel.size,
    fontWeight: "500",
    lineHeight: typography.tabLabel.lineHeight,
    fontFamily: fonts.bodyMedium,
  },
  fabSlot: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    // Material 3 squircle — 14–16px border radius, NOT circular
    borderRadius: FAB_RADIUS,
    backgroundColor: colors.blue,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.fab,
    // Inset highlight — approximated on Android with a hairline top border.
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.22)",
  },
  gestureArea: {
    alignItems: "center",
    paddingTop: 6,
  },
  gesturePill: {
    width: 104,
    height: 3,
    borderRadius: radii.chip,
    backgroundColor: colors.text2,
    opacity: 0.5,
  },
});
