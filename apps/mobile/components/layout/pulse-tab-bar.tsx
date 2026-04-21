import { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Home, BarChart3, Dumbbell, User, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { colors, radii, fonts, shadows, typography } from "@/lib/theme";
import * as Haptics from "@/lib/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Lime pill that slides between tabs in a group. Each side of the FAB
// gets its own indicator so the pill never has to skip across the gap.
// groupWidth is measured on the parent tabGroup's onLayout so we can
// translate by real pixels rather than percents (reanimated's web runtime
// is picky about percent translations).
function GroupIndicator({
  activeIndex,
  tabCount,
  groupWidth,
}: {
  activeIndex: number;
  tabCount: number;
  groupWidth: number;
}) {
  const tabWidth = groupWidth / tabCount;
  const translate = useSharedValue(Math.max(0, activeIndex) * tabWidth);
  const visibility = useSharedValue(activeIndex >= 0 ? 1 : 0);

  useEffect(() => {
    if (activeIndex >= 0) {
      translate.value = withSpring(activeIndex * tabWidth, {
        damping: 18,
        stiffness: 220,
        mass: 0.9,
      });
      visibility.value = withTiming(1, { duration: 180 });
    } else {
      visibility.value = withTiming(0, { duration: 160 });
    }
  }, [activeIndex, tabWidth, translate, visibility]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translate.value }],
    opacity: visibility.value,
  }));

  if (tabWidth === 0) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          bottom: 6,
          left: 0,
          width: tabWidth,
          height: 34,
          paddingHorizontal: 8,
        },
        animatedStyle,
      ]}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radii.button,
          backgroundColor: colors.blueSoft,
          borderWidth: 1,
          borderColor: colors.blueSoft,
        }}
      />
    </Animated.View>
  );
}

// Dedicated TabButton so each tab holds its own icon-scale shared value —
// a tab pop only affects the tab being tapped, not the whole bar.
function TabButton({
  name,
  label,
  Icon,
  isActive,
  onPress,
}: {
  name: string;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  isActive: boolean;
  onPress: () => void;
}) {
  const iconColor = isActive ? colors.blue : colors.text3;
  const labelColor = isActive ? colors.blue2 : colors.text3;
  const tabTestId = `tab-${name.toLowerCase()}`;

  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (isActive) {
      iconScale.value = withSequence(
        withSpring(1.18, { damping: 10, stiffness: 340 }),
        withSpring(1, { damping: 14, stiffness: 260 }),
      );
    }
  }, [isActive, iconScale]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <Pressable
      testID={tabTestId}
      style={styles.tabItem}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
    >
      <Animated.View style={iconAnimatedStyle}>
        <Icon size={ICON_SIZE} color={iconColor} />
      </Animated.View>
      <Text style={[styles.tabLabel, { color: labelColor }]}>{label}</Text>
    </Pressable>
  );
}

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
    if (!event.defaultPrevented) {
      if (state.index !== routeIndex) Haptics.selectionAsync();
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
    return (
      <TabButton
        key={name}
        name={name}
        label={label}
        Icon={Icon}
        isActive={isActive}
        onPress={() => handleTabPress(name, routeIndex)}
      />
    );
  };

  // Which tab within each group is active? -1 = none (e.g. user is on the
  // other group's tab).
  const leftActiveIndex = LEFT_TABS.findIndex(
    (t) => routeNames.indexOf(t.name) === state.index,
  );
  const rightActiveIndex = RIGHT_TABS.findIndex(
    (t) => routeNames.indexOf(t.name) === state.index,
  );

  // Measured once via onLayout — both groups are flex:1 so they share width.
  const [groupWidth, setGroupWidth] = useState(0);

  return (
    <View style={styles.wrapper}>
      <View style={styles.tabBar}>
        <View
          style={styles.tabGroup}
          onLayout={(e) => setGroupWidth(e.nativeEvent.layout.width)}
        >
          <GroupIndicator
            activeIndex={leftActiveIndex}
            tabCount={LEFT_TABS.length}
            groupWidth={groupWidth}
          />
          {LEFT_TABS.map(({ name, label, Icon }) => renderTabButton(name, label, Icon))}
        </View>

        <View style={styles.fabSlot}>
          <AnimatedPressable
            testID="fab-button"
            onPressIn={() => {
              fabScale.value = withSpring(0.9, { damping: 14, stiffness: 340 });
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          <GroupIndicator
            activeIndex={rightActiveIndex}
            tabCount={RIGHT_TABS.length}
            groupWidth={groupWidth}
          />
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
