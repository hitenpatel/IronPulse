import { useEffect, useState } from "react";
import { View, Text, ActivityIndicator, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator, type NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "react-native";

// NativeWind CSS — import conditionally to avoid breaking without expo-router's Metro setup
try { require("./global.css"); } catch {}

import { AuthProvider, useAuth } from "./lib/auth";
import { trpc } from "./lib/trpc";
import { useNotificationDeepLink } from "./lib/useNotificationDeepLink";
import { registerForPushNotifications, addPushTokenListener } from "./lib/notifications";
import { NewSessionSheet } from "./components/layout/new-session-sheet";
import { TemplatePicker } from "./components/workout/template-picker";

// ─── Screen imports ──────────────────────────────────────────────
// Auth
import LoginScreen from "./app/(auth)/login";
import SignupScreen from "./app/(auth)/signup";
import OnboardingScreen from "./app/(auth)/onboarding";
import ForgotPasswordScreen from "./app/(auth)/forgot-password";

// Tabs
import DashboardScreen from "./app/(tabs)/index";
import StatsScreen from "./app/(tabs)/stats";
import ExercisesScreen from "./app/(tabs)/exercises";
import ProfileScreen from "./app/(tabs)/profile";

// Workout
import ActiveWorkoutScreen from "./app/workout/active";
import AddExerciseScreen from "./app/workout/add-exercise";
import WorkoutCompleteScreen from "./app/workout/complete";

// Cardio
import TypePickerScreen from "./app/cardio/type-picker";
import TrackingScreen from "./app/cardio/tracking";
import ManualCardioScreen from "./app/cardio/manual";
import SummaryScreen from "./app/cardio/summary";

// History
import WorkoutHistoryScreen from "./app/history/workouts";
import WorkoutDetailScreen from "./app/history/workout/[id]";
import CardioHistoryScreen from "./app/history/cardio";
import CardioDetailScreen from "./app/history/cardio-detail/[id]";

// Settings
import SettingsScreen from "./app/settings/index";
import IntegrationsScreen from "./app/settings/integrations";
import SubscriptionScreen from "./app/settings/subscription";

// Messages
import MessagesScreen from "./app/messages/index";
import MessageThreadScreen from "./app/messages/[userId]";

// Coach
import CoachScreen from "./app/coach/index";
import ClientDetailScreen from "./app/coach/clients/[id]";

// Calendar, Feed, Challenges
import CalendarScreen from "./app/calendar/index";
import FeedScreen from "./app/feed/index";
import ChallengesScreen from "./app/challenges/index";

// Custom Tab Bar
import { PulseTabBar } from "./components/layout/pulse-tab-bar";

// ─── Type definitions ────────────────────────────────────────────
export type RootStackParamList = {
  Auth: undefined;
  MainTabs: undefined;
  // Workout
  WorkoutActive: { workoutId: string };
  WorkoutAddExercise: { workoutId: string };
  WorkoutComplete: { workoutId: string; prs: string };
  // Cardio
  CardioTypePicker: undefined;
  CardioTracking: { type: string; sessionId?: string };
  CardioManual: { type: string };
  CardioSummary: { sessionId: string; type: string };
  // History
  HistoryWorkouts: undefined;
  HistoryWorkoutDetail: { id: string };
  HistoryCardio: undefined;
  HistoryCardioDetail: { id: string };
  // Settings
  Settings: undefined;
  SettingsIntegrations: undefined;
  SettingsSubscription: undefined;
  // Messages
  Messages: undefined;
  MessageThread: { userId: string };
  // Coach
  Coach: undefined;
  CoachClientDetail: { id: string };
  // Calendar, Feed, Challenges
  Calendar: undefined;
  Feed: undefined;
  Challenges: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  Onboarding: undefined;
  ForgotPassword: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Stats: undefined;
  Exercises: undefined;
  Profile: undefined;
};

// ─── Navigators ──────────────────────────────────────────────────
const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const HEADER_STYLE = {
  headerStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
  headerTintColor: "hsl(213, 31%, 91%)",
};

// ─── Auth Navigator ──────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Main Tab Navigator ──────────────────────────────────────────
function MainTabNavigator() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  const toggleSheet = () => setSheetOpen((prev) => !prev);

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <PulseTabBar
          {...props}
          sheetOpen={sheetOpen}
          onFabPress={toggleSheet}
        />
      )}
    >
      <Tab.Screen name="Home" component={DashboardScreen} options={{ title: "Home" }} />
      <Tab.Screen name="Stats" component={StatsScreen} options={{ title: "Stats" }} />
      <Tab.Screen name="Exercises" component={ExercisesScreen} options={{ title: "Exercises" }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: "Profile" }} />
    </Tab.Navigator>
  );
}

// ─── Root Navigator (auth-gated) ─────────────────────────────────
// Component that must be inside NavigationContainer
function NotificationHandler() {
  useNotificationDeepLink();
  return null;
}

// Initialize PowerSync synchronously so context is always available for hooks
let PSContext: any = null;
let psDb: any = null;
try {
  PSContext = require("@powersync/react").PowerSyncContext;
  const { getPowerSyncDatabase } = require("./lib/powersync");
  psDb = getPowerSyncDatabase();
} catch (err) {
  console.warn("PowerSync init:", err);
}

function RootNavigator() {
  const { user, isLoading } = useAuth();
  const [db] = useState(psDb);
  const [powersyncReady] = useState(true);

  // Connect/disconnect PowerSync based on auth state
  useEffect(() => {
    if (!db || !powersyncReady) return;
    if (user) {
      try {
        const { createMobileConnector } = require("@/lib/powersync");
        const connector = createMobileConnector();
        db.connect(connector);
      } catch {}

      // Push notifications (best-effort)
      (async () => {
        try {
          const token = await registerForPushNotifications();
          if (token) {
            await trpc.user.registerPushToken.mutate({
              token,
              platform: Platform.OS as "ios" | "android",
            });
          }
        } catch {}
      })();

      // HealthKit / Google Fit sync (best-effort)
      (async () => {
        try {
          const { isHealthKitConnected, syncFromHealthKit } = require("@/lib/healthkit");
          if (await isHealthKitConnected()) {
            await syncFromHealthKit(db, user.id);
          }
        } catch {}
        try {
          const { isGoogleFitConnected, syncFromGoogleFit } = require("@/lib/googlefit");
          if (await isGoogleFitConnected()) {
            await syncFromGoogleFit(db, user.id);
          }
        } catch {}
      })();
    }
  }, [user, db, powersyncReady]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#060B14" }}>
        <ActivityIndicator color="#F0F4F8" size="large" />
        <Text style={{ color: "#F0F4F8", marginTop: 16, fontSize: 16 }} testID="loading-text">Loading IronPulse...</Text>
      </View>
    );
  }

  const needsAuth = !user;
  const needsOnboarding = user && user.onboardingComplete === false;

  const navigator = (
    <NavigationContainer>
      <NotificationHandler />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {needsAuth || needsOnboarding ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
        {/* Main tabs */}
        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />

        {/* Workout stack */}
        <RootStack.Screen
          name="WorkoutActive"
          component={ActiveWorkoutScreen}
          options={{ gestureEnabled: false, contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" } }}
        />
        <RootStack.Screen
          name="WorkoutAddExercise"
          component={AddExerciseScreen}
          options={{ contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" } }}
        />
        <RootStack.Screen
          name="WorkoutComplete"
          component={WorkoutCompleteScreen}
          options={{ contentStyle: { backgroundColor: "hsl(224, 71%, 4%)" } }}
        />

        {/* Cardio stack */}
        <RootStack.Screen
          name="CardioTypePicker"
          component={TypePickerScreen}
          options={{ contentStyle: { backgroundColor: "#060B14" } }}
        />
        <RootStack.Screen
          name="CardioTracking"
          component={TrackingScreen}
          options={{ contentStyle: { backgroundColor: "#060B14" } }}
        />
        <RootStack.Screen
          name="CardioManual"
          component={ManualCardioScreen}
          options={{ contentStyle: { backgroundColor: "#060B14" } }}
        />
        <RootStack.Screen
          name="CardioSummary"
          component={SummaryScreen}
          options={{ contentStyle: { backgroundColor: "#060B14" } }}
        />

        {/* History */}
        <RootStack.Screen
          name="HistoryWorkouts"
          component={WorkoutHistoryScreen}
          options={{ headerShown: true, title: "Workouts", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="HistoryWorkoutDetail"
          component={WorkoutDetailScreen}
          options={{ headerShown: true, title: "Workout", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="HistoryCardio"
          component={CardioHistoryScreen}
          options={{ headerShown: true, title: "Cardio", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="HistoryCardioDetail"
          component={CardioDetailScreen}
          options={{ headerShown: true, title: "Cardio", ...HEADER_STYLE }}
        />

        {/* Settings */}
        <RootStack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ headerShown: true, title: "Settings", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="SettingsIntegrations"
          component={IntegrationsScreen}
          options={{ headerShown: true, title: "Connected Apps", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="SettingsSubscription"
          component={SubscriptionScreen}
          options={{ headerShown: true, title: "Subscription", ...HEADER_STYLE }}
        />

        {/* Messages */}
        <RootStack.Screen
          name="Messages"
          component={MessagesScreen}
          options={{ headerShown: true, title: "Messages", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="MessageThread"
          component={MessageThreadScreen}
          options={{ headerShown: true, title: "Chat", ...HEADER_STYLE }}
        />

        {/* Coach */}
        <RootStack.Screen
          name="Coach"
          component={CoachScreen}
          options={{ headerShown: true, title: "Coaching", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="CoachClientDetail"
          component={ClientDetailScreen}
          options={{ headerShown: true, title: "Client Progress", ...HEADER_STYLE }}
        />

        {/* Calendar, Feed, Challenges */}
        <RootStack.Screen
          name="Calendar"
          component={CalendarScreen}
          options={{ headerShown: true, title: "Calendar", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="Feed"
          component={FeedScreen}
          options={{ headerShown: true, title: "Feed", ...HEADER_STYLE }}
        />
        <RootStack.Screen
          name="Challenges"
          component={ChallengesScreen}
          options={{ headerShown: true, title: "Challenges", ...HEADER_STYLE }}
        />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );

  // Always wrap in PowerSync provider so hooks don't crash
  if (PSContext?.Provider && db) {
    return <PSContext.Provider value={db}>{navigator}</PSContext.Provider>;
  }

  return navigator;
}

// ─── Error Boundary ──────────────────────────────────────────────
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  state = { error: null as any };
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#060B14", padding: 20 }}>
          <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>App Error</Text>
          <Text style={{ color: "#F0F4F8", fontSize: 14 }} testID="error-message">
            {String(this.state.error?.message || this.state.error)}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

import React from "react";

// ─── App Entry ───────────────────────────────────────────────────
export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar barStyle="light-content" backgroundColor="#060B14" />
          <RootNavigator />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
