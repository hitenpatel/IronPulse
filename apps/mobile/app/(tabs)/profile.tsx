import { useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@powersync/react";
import {
  Bell,
  Calculator,
  Calendar,
  Camera,
  ChevronRight,
  Download,
  Dumbbell,
  Heart,
  LogOut,
  MessageSquare,
  Moon,
  Settings as SettingsIcon,
  Shield,
  Target,
  Trophy,
  Upload,
  Users,
  Utensils,
  Zap,
} from "lucide-react-native";

import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import { useWorkouts, useCardioSessions } from "@ironpulse/sync";
import {
  isBiometricAvailable,
  isBiometricEnabled,
  enableBiometric,
  disableBiometric,
  getBiometricLabel,
} from "@/lib/biometric";
import { colors, fonts, radii, spacing, tracking } from "@/lib/theme";
import { BigNum, Chip, Row, RowList, UppercaseLabel } from "@/components/ui";
import type { RootStackParamList } from "../../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface NavItem {
  label: string;
  subtitle?: string;
  screen: keyof RootStackParamList;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  tone: "blue" | "green" | "amber" | "purple" | "mono";
}

interface Section {
  title: string;
  items: NavItem[];
}

/** Approximate "level" from number of completed workouts — purely cosmetic. */
function levelFromWorkouts(count: number): number {
  return 1 + Math.floor(count / 10);
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<Nav>();

  const { data: workouts } = useWorkouts();
  const { data: cardioSessions } = useCardioSessions();
  const { data: prRows } = useQuery<{ total: number }>(
    `SELECT COUNT(*) AS total FROM personal_records`,
    [],
  );
  const prCount = prRows?.[0]?.total ?? 0;

  const [streak, setStreak] = useState<{ current: number; longest: number } | null>(null);
  useEffect(() => {
    trpc.analytics.streak.query().then(setStreak).catch(() => {});
  }, []);

  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [bioLabel, setBioLabel] = useState("Biometric");
  const [bioLoading, setBioLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const available = await isBiometricAvailable();
      setBioAvailable(available);
      if (available) {
        setBioEnabled(await isBiometricEnabled());
        setBioLabel(await getBiometricLabel());
      }
    })();
  }, []);

  const [deletionRequested, setDeletionRequested] = useState(false);
  const [deletionRequestedAt, setDeletionRequestedAt] = useState<string | null>(null);
  const [deletionLoading, setDeletionLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await trpc.user.me.query();
        if (result.user.deletionRequestedAt) {
          setDeletionRequested(true);
          setDeletionRequestedAt(String(result.user.deletionRequestedAt));
        }
      } catch {
        /* ignore network errors */
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const workoutCount = workouts?.length ?? 0;
    const cardioCount = cardioSessions?.length ?? 0;
    const totalSeconds =
      (workouts ?? []).reduce((acc, w) => acc + (w.duration_seconds ?? 0), 0) +
      (cardioSessions ?? []).reduce((acc, c) => acc + (c.duration_seconds ?? 0), 0);
    const hours = Math.round(totalSeconds / 3600);
    return { workoutCount, cardioCount, hours };
  }, [workouts, cardioSessions]);

  const handleBiometricToggle = async (value: boolean) => {
    setBioLoading(true);
    if (value) {
      const success = await enableBiometric();
      setBioEnabled(success);
    } else {
      await disableBiometric();
      setBioEnabled(false);
    }
    setBioLoading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Account",
      "This will delete all your data after 7 days. You can cancel within that period.",
      [
        { text: "Keep my account", style: "cancel" },
        {
          text: "Yes, delete",
          style: "destructive",
          onPress: async () => {
            setDeletionLoading(true);
            try {
              const result = await trpc.user.requestDeletion.mutate();
              if (result.success) {
                setDeletionRequested(true);
                setDeletionRequestedAt(new Date().toISOString());
              }
            } catch {
              Alert.alert("Error", "Failed to request deletion.");
            } finally {
              setDeletionLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleCancelDeletion = () => {
    Alert.alert("Cancel Deletion", "Keep your account and all your data?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, keep my account",
        onPress: async () => {
          setDeletionLoading(true);
          try {
            await trpc.user.cancelDeletion.mutate();
            setDeletionRequested(false);
            setDeletionRequestedAt(null);
          } catch {
            Alert.alert("Error", "Failed to cancel deletion.");
          } finally {
            setDeletionLoading(false);
          }
        },
      },
    ]);
  };

  const sections: Section[] = [
    {
      title: "Communication",
      items: [
        { label: "Notifications", screen: "Notifications", icon: Bell, tone: "blue" },
        { label: "Messages", screen: "Messages", icon: MessageSquare, tone: "blue" },
      ],
    },
    {
      title: "Training",
      items: [
        { label: "My program", subtitle: "Weekly schedule", screen: "Program", icon: Calendar, tone: "blue" },
        { label: "Workout templates", screen: "WorkoutTemplates", icon: Dumbbell, tone: "blue" },
        {
          label: "Records",
          subtitle: `${prCount} lifetime ${prCount === 1 ? "PR" : "PRs"}`,
          screen: "HistoryWorkouts",
          icon: Trophy,
          tone: "amber",
        },
        { label: "Goals", screen: "Goals", icon: Target, tone: "purple" },
        { label: "Progress photos", screen: "ProgressPhotos", icon: Camera, tone: "green" },
        { label: "Tools", subtitle: "1RM + plate calculators", screen: "Tools", icon: Calculator, tone: "amber" },
      ],
    },
    {
      title: "Recovery",
      items: [
        { label: "Nutrition", screen: "Nutrition", icon: Utensils, tone: "green" },
        { label: "Sleep", screen: "Sleep", icon: Moon, tone: "purple" },
      ],
    },
    {
      title: "Social",
      items: [
        { label: "Feed", screen: "Feed", icon: Zap, tone: "blue" },
        { label: "Coaching", screen: "Coach", icon: Users, tone: "blue" },
        { label: "Find a coach", screen: "Coaches", icon: Heart, tone: "blue" },
        { label: "Challenges", screen: "Challenges", icon: Trophy, tone: "amber" },
      ],
    },
    {
      title: "Data",
      items: [
        { label: "Export data", screen: "ExportData", icon: Download, tone: "mono" },
        { label: "Import workouts", screen: "ImportData", icon: Upload, tone: "mono" },
      ],
    },
    {
      title: "App",
      items: [
        { label: "Settings", screen: "Settings", icon: SettingsIcon, tone: "mono" },
        { label: "Connected apps", screen: "SettingsIntegrations", icon: Zap, tone: "blue" },
        { label: "Subscription", screen: "SettingsSubscription", icon: Shield, tone: "purple" },
        { label: "Password & Passkeys", screen: "SecuritySettings", icon: Shield, tone: "mono" },
      ],
    },
  ];

  const level = levelFromWorkouts(stats.workoutCount);
  const initial = (user?.name ?? "?").charAt(0).toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero band — gradient extends -16px into gutter both sides */}
        <View
          style={{
            paddingTop: 36,
            paddingBottom: 20,
            paddingHorizontal: 16,
            // v2 hero tint — soft cobalt wash on the warmer ink base.
            backgroundColor: colors.greenSoft,
            position: "relative",
          }}
        >
          <Pressable
            testID="profile-settings"
            onPress={() => navigation.navigate("Settings")}
            hitSlop={8}
            style={{
              position: "absolute",
              top: 10,
              right: 12,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <SettingsIcon size={24} color={colors.text2} />
          </Pressable>

          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                // Handoff specifies a cobalt→purple gradient; approximated as
                // solid cobalt (colors.green in v2). A real gradient needs
                // react-native-linear-gradient — deferred to the audit ticket.
                backgroundColor: colors.green,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.bg,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.displaySemi,
                  fontSize: 22,
                  color: colors.text,
                }}
              >
                {initial}
              </Text>
            </View>

            <View style={{ flex: 1, minWidth: 0 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontFamily: fonts.displaySemi,
                  fontSize: 18,
                  color: colors.text,
                  letterSpacing: -0.3,
                }}
              >
                {user?.name ?? "Athlete"}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 2,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 10.5, color: colors.text3, fontFamily: fonts.bodyRegular }}
                >
                  @{user?.email?.split("@")[0] ?? "athlete"}
                </Text>
                <Text style={{ color: colors.text4, fontSize: 10.5 }}>·</Text>
                <Text
                  style={{
                    fontSize: 10.5,
                    color: colors.text3,
                    textTransform: "capitalize",
                    fontFamily: fonts.bodyRegular,
                  }}
                >
                  {user?.tier ?? "athlete"}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4, marginTop: 6 }}>
                <Chip tone="blue">Level {level}</Chip>
                {streak && streak.current > 0 ? (
                  <Chip tone="amber">{streak.current}d streak</Chip>
                ) : null}
              </View>
            </View>
          </View>

          {/* 3-col stat strip */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 16,
              borderTopWidth: 1,
              borderTopColor: colors.lineSoft,
              paddingTop: 12,
            }}
          >
            {[
              { l: "Workouts", v: String(stats.workoutCount) },
              { l: "PRs", v: String(prCount) },
              { l: "Hours", v: String(stats.hours) },
            ].map((s, i) => (
              <View
                key={s.l}
                style={{
                  flex: 1,
                  alignItems: "center",
                  borderLeftWidth: i > 0 ? 1 : 0,
                  borderLeftColor: colors.lineSoft,
                }}
              >
                <BigNum size={18}>{s.v}</BigNum>
                <UppercaseLabel style={{ fontSize: 9, marginTop: 2 }}>{s.l}</UppercaseLabel>
              </View>
            ))}
          </View>
        </View>

        {/* Sections */}
        <View style={{ paddingHorizontal: spacing.gutter, paddingTop: 14 }}>
          {sections.map((section) => (
            <View key={section.title} style={{ marginBottom: 14 }}>
              <UppercaseLabel style={{ marginBottom: 6 }}>{section.title}</UppercaseLabel>
              <RowList>
                {section.items.map((item) => {
                  const IconCmp = item.icon;
                  return (
                    <Row
                      key={`${section.title}-${item.label}`}
                      leading={<IconCmp size={18} />}
                      leadingTone={item.tone}
                      title={item.label}
                      subtitle={item.subtitle}
                      chevron
                      onPress={() => navigation.navigate(item.screen as never)}
                    />
                  );
                })}
              </RowList>
            </View>
          ))}

          {/* Biometric toggle */}
          {bioAvailable ? (
            <View style={{ marginBottom: 14 }}>
              <UppercaseLabel style={{ marginBottom: 6 }}>Security</UppercaseLabel>
              <View
                style={{
                  backgroundColor: colors.bg1,
                  borderRadius: radii.rowList,
                  borderWidth: 1,
                  borderColor: colors.lineSoft,
                  paddingVertical: spacing.rowPaddingY,
                  paddingHorizontal: spacing.rowPaddingX,
                  flexDirection: "row",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: colors.text,
                    fontFamily: fonts.bodyMedium,
                  }}
                >
                  {bioLabel} Unlock
                </Text>
                <Switch
                  value={bioEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={bioLoading}
                  trackColor={{ false: colors.bg3, true: colors.blue }}
                  thumbColor={colors.white}
                />
              </View>
            </View>
          ) : null}

          {/* Danger zone */}
          <View
            style={{
              backgroundColor: colors.bg1,
              borderRadius: radii.card,
              borderWidth: 1,
              borderColor: colors.red,
              padding: 14,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                color: colors.red,
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: tracking.caps,
                fontFamily: fonts.bodySemi,
                marginBottom: 6,
              }}
            >
              Danger zone
            </Text>
            {deletionRequested ? (
              <>
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: 12,
                    marginBottom: 10,
                    fontFamily: fonts.bodyRegular,
                  }}
                >
                  Your account is scheduled for deletion on{" "}
                  {deletionRequestedAt
                    ? new Date(
                        new Date(deletionRequestedAt).getTime() + 7 * 86400000,
                      ).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "soon"}
                  .
                </Text>
                <Pressable
                  onPress={handleCancelDeletion}
                  disabled={deletionLoading}
                  style={{
                    height: 40,
                    borderRadius: radii.button,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: colors.line,
                    opacity: deletionLoading ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: colors.text, fontSize: 13, fontFamily: fonts.bodySemi }}>
                    {deletionLoading ? "Cancelling…" : "Cancel deletion"}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text
                  style={{
                    color: colors.text3,
                    fontSize: 12,
                    marginBottom: 10,
                    fontFamily: fonts.bodyRegular,
                  }}
                >
                  Permanently delete your account and data. You have 7 days to cancel.
                </Text>
                <Pressable
                  onPress={handleDelete}
                  disabled={deletionLoading}
                  style={{
                    height: 40,
                    borderRadius: radii.button,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.red,
                    opacity: deletionLoading ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: colors.white, fontSize: 13, fontFamily: fonts.bodySemi }}>
                    {deletionLoading ? "Requesting…" : "Delete my account"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          {/* Sign out */}
          <Pressable
            onPress={signOut}
            testID="sign-out-button"
            style={{
              height: 44,
              borderRadius: radii.card,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: colors.bg1,
              borderWidth: 1,
              borderColor: colors.lineSoft,
              flexDirection: "row",
              gap: 8,
            }}
          >
            <LogOut size={14} color={colors.red} />
            <Text style={{ color: colors.red, fontSize: 13, fontFamily: fonts.bodySemi }}>
              Sign out
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
