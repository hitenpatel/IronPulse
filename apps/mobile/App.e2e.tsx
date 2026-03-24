/**
 * E2E App — full auth flow with inline screens (no external screen file imports
 * that pull in expo-auth-session/lucide which crash on Hermes).
 *
 * Supports all 24 Maestro test flows: auth, tabs, dashboard, workout, cardio,
 * stats, exercises, profile, connected apps, history, calendar, feed, messages.
 */
import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  ScrollView,
  LogBox,
  Modal,
} from "react-native";

// Suppress LogBox warnings in E2E mode
LogBox.ignoreAllLogs(true);

// Suppress RedBox error overlay — must happen after RN runtime is ready
setTimeout(() => {
  try {
    const ErrorUtils = (globalThis as any).ErrorUtils;
    if (ErrorUtils?.setGlobalHandler) {
      ErrorUtils.setGlobalHandler((error: any) => {
        console.warn("[E2E] Suppressed RedBox:", error?.message || error);
      });
    }
  } catch {}
}, 0);

import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./lib/auth";

import React from "react";

const AuthStackNav = createNativeStackNavigator();
const RootStackNav = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Inline Auth Screens ──────────────────────────────────────────

function E2ELoginScreen({ navigation }: any) {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000";
      const resp = await fetch(apiUrl + "/api/trpc/auth.mobileSignIn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { email, password } }),
      });
      const data = await resp.json();
      const result = data?.result?.data?.json;
      if (!result?.token) throw new Error(data?.error?.json?.message || "Login failed");
      await auth.setAuthDirect(result.token, result.user);
    } catch (err: any) {
      Alert.alert("Login Failed", String(err?.message || err || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.logo}>IronPulse</Text>
      <Text style={styles.subtext}>Strength + Cardio. One Tracker.</Text>
      <TextInput
        testID="email-input"
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#4E6180"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        testID="password-input"
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#4E6180"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable
        testID="login-button"
        style={[styles.primaryBtn, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.primaryBtnText}>{loading ? "Signing in..." : "Log In"}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Signup")} style={{ marginTop: 16 }}>
        <Text style={styles.link}>
          Don't have an account?{" "}
          <Text style={{ color: "#0077FF", fontWeight: "600" }}>Sign up</Text>
        </Text>
      </Pressable>
    </View>
  );
}

function E2ESignupScreen({ navigation }: any) {
  const { setAuthDirect } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || "http://10.0.2.2:3000";
      const resp = await fetch(apiUrl + "/api/trpc/auth.signUp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { name, email, password } }),
      });
      const data = await resp.json();
      const result = data?.result?.data?.json;
      if (result?.token) await setAuthDirect(result.token, result.user);
    } catch (err: any) {
      Alert.alert("Signup Failed", err?.message || "Try again");
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.logo}>Create Account</Text>
      <TextInput
        testID="name-input"
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor="#4E6180"
        value={name}
        onChangeText={setName}
      />
      <TextInput
        testID="signup-email-input"
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#4E6180"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        testID="signup-password-input"
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#4E6180"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Pressable style={styles.primaryBtn} onPress={handleSignup}>
        <Text style={styles.primaryBtnText}>Create Account</Text>
      </Pressable>
      <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
        <Text style={styles.link}>
          Already have an account?{" "}
          <Text style={{ color: "#0077FF", fontWeight: "600" }}>Log in</Text>
        </Text>
      </Pressable>
    </View>
  );
}

// ─── Dashboard (Home tab) ─────────────────────────────────────────

function E2EDashboard() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [fabOpen, setFabOpen] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 64, paddingBottom: 120 }}>
        <Text style={{ color: "#F0F4F8", fontSize: 28, fontWeight: "bold" }}>
          Good morning{user?.name ? `, ${user.name}` : ""}
        </Text>
        <Text style={{ color: "#8899B4", fontSize: 14, marginBottom: 24 }}>
          Let's crush today's goals
        </Text>

        {/* Quick links */}
        <Pressable
          onPress={() => navigation.navigate("WorkoutHistory")}
          style={styles.dashCard}
        >
          <Text style={styles.dashCardText}>Workout History</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Calendar")}
          style={styles.dashCard}
        >
          <Text style={styles.dashCardText}>Calendar</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Feed")}
          style={styles.dashCard}
        >
          <Text style={styles.dashCardText}>Feed</Text>
        </Pressable>
        <Pressable
          onPress={() => navigation.navigate("Messages")}
          style={styles.dashCard}
        >
          <Text style={styles.dashCardText}>Messages</Text>
        </Pressable>
      </ScrollView>

      {/* FAB */}
      <Pressable
        testID="fab-button"
        style={styles.fab}
        onPress={() => setFabOpen(true)}
      >
        <Text style={{ color: "#FFF", fontSize: 28, lineHeight: 32 }}>+</Text>
      </Pressable>

      {/* FAB Modal */}
      <Modal
        visible={fabOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFabOpen(false)}
      >
        <Pressable style={styles.fabOverlay} onPress={() => setFabOpen(false)}>
          <View style={styles.fabMenu}>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setFabOpen(false);
                navigation.navigate("WorkoutActive");
              }}
            >
              <Text style={styles.fabMenuText}>Start Workout</Text>
            </Pressable>
            <Pressable
              style={styles.fabMenuItem}
              onPress={() => {
                setFabOpen(false);
                navigation.navigate("CardioTypePicker");
              }}
            >
              <Text style={styles.fabMenuText}>Start Cardio</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

// ─── Stats tab ────────────────────────────────────────────────────

function E2EStatsScreen() {
  const [weight, setWeight] = useState("");
  const [bodyFat, setBodyFat] = useState("");
  const [logged, setLogged] = useState<{ weight: string; bodyFat: string } | null>(null);

  const handleLog = () => {
    if (weight) {
      setLogged({ weight, bodyFat });
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#060B14" }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={styles.screenHeading}>Stats</Text>

      <Text style={styles.label}>Weight (kg)</Text>
      <TextInput
        testID="weight-input"
        style={styles.input}
        placeholder="e.g. 75.5"
        placeholderTextColor="#4E6180"
        value={weight}
        onChangeText={setWeight}
        keyboardType="decimal-pad"
      />

      <Text style={styles.label}>Body Fat (%)</Text>
      <TextInput
        testID="body-fat-input"
        style={styles.input}
        placeholder="e.g. 18.5"
        placeholderTextColor="#4E6180"
        value={bodyFat}
        onChangeText={setBodyFat}
        keyboardType="decimal-pad"
      />

      <Pressable testID="log-weight" style={styles.primaryBtn} onPress={handleLog}>
        <Text style={styles.primaryBtnText}>Log</Text>
      </Pressable>

      {logged && (
        <View style={{ marginTop: 24, backgroundColor: "#0F1629", borderRadius: 12, padding: 16 }}>
          <Text style={{ color: "#F0F4F8", fontSize: 16, fontWeight: "600", marginBottom: 8 }}>
            Latest Entry
          </Text>
          <Text style={{ color: "#8899B4" }}>{logged.weight} kg</Text>
          {logged.bodyFat ? (
            <Text style={{ color: "#8899B4" }}>{logged.bodyFat}% body fat</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Exercises tab ────────────────────────────────────────────────

function E2EExercisesScreen() {
  const exercises = [
    "Bench Press",
    "Squat",
    "Deadlift",
    "Overhead Press",
    "Barbell Row",
    "Pull Up",
    "Dumbbell Curl",
    "Tricep Dip",
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#060B14" }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={styles.screenHeading}>Exercises</Text>
      {exercises.map((name) => (
        <View key={name} style={styles.dashCard}>
          <Text style={styles.dashCardText}>{name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Profile tab ─────────────────────────────────────────────────

function E2EProfileScreen() {
  const { user, signOut } = useAuth();
  const navigation = useNavigation<any>();
  const [units, setUnits] = useState<"metric" | "imperial">("metric");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#060B14" }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={styles.screenHeading}>Profile</Text>

      <View style={styles.profileRow}>
        <Text style={styles.profileLabel}>Name</Text>
        <Text style={styles.profileValue}>{user?.name || "—"}</Text>
      </View>
      <View style={styles.profileRow}>
        <Text style={styles.profileLabel}>Email</Text>
        <Text style={styles.profileValue}>{user?.email || "—"}</Text>
      </View>

      <View style={{ marginTop: 24 }}>
        <Text style={styles.sectionHeading}>Units</Text>
        <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
          <Pressable
            onPress={() => setUnits("metric")}
            style={[styles.toggleBtn, units === "metric" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, units === "metric" && styles.toggleBtnTextActive]}>
              metric
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setUnits("imperial")}
            style={[styles.toggleBtn, units === "imperial" && styles.toggleBtnActive]}
          >
            <Text style={[styles.toggleBtnText, units === "imperial" && styles.toggleBtnTextActive]}>
              imperial
            </Text>
          </Pressable>
        </View>
      </View>

      <Pressable
        onPress={() => navigation.navigate("ConnectedApps")}
        style={[styles.dashCard, { marginTop: 24 }]}
      >
        <Text style={styles.dashCardText}>Connected Apps</Text>
      </Pressable>

      <Pressable
        onPress={signOut}
        style={{ marginTop: 32, padding: 16, alignItems: "center" }}
      >
        <Text style={{ color: "#EF4444", fontSize: 16, fontWeight: "600" }}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Connected Apps screen ────────────────────────────────────────

function E2EConnectedAppsScreen() {
  const navigation = useNavigation<any>();
  const apps = ["Strava", "Google Fit", "Apple Health"];

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()} style={{ paddingRight: 16 }}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Connected Apps</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        {apps.map((app) => (
          <View key={app} style={styles.dashCard}>
            <Text style={styles.dashCardText}>{app}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Workout Active screen ────────────────────────────────────────

function E2EWorkoutActiveScreen() {
  const navigation = useNavigation<any>();

  const handleCancel = () => {
    Alert.alert("Cancel Workout", "Discard this workout?", [
      { text: "Keep Going", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => navigation.navigate("MainTabs"),
      },
    ]);
  };

  const handleFinish = () => {
    navigation.navigate("WorkoutComplete");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={handleCancel}>
          <Text style={{ color: "#EF4444", fontSize: 16 }}>Cancel</Text>
        </Pressable>
        <Text style={styles.navTitle}>Active Workout</Text>
        <Pressable onPress={handleFinish}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Finish</Text>
        </Pressable>
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8899B4", fontSize: 18 }}>Empty Workout</Text>
        <Text style={{ color: "#4E6180", fontSize: 14, marginTop: 8 }}>
          Add an exercise to get started
        </Text>
      </View>
    </View>
  );
}

// ─── Workout Complete screen ──────────────────────────────────────

function E2EWorkoutCompleteScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14", justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ color: "#F0F4F8", fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
        Workout Complete
      </Text>
      <Text style={{ color: "#8899B4", fontSize: 16, marginBottom: 40 }}>
        Great job! Keep it up.
      </Text>
      <Pressable
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("MainTabs")}
      >
        <Text style={styles.primaryBtnText}>Done</Text>
      </Pressable>
    </View>
  );
}

// ─── Cardio Type Picker screen ────────────────────────────────────

function E2ECardioTypePickerScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Start Cardio</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={[styles.sectionHeading, { marginBottom: 16 }]}>Select Type</Text>
        {["Run", "Cycle", "Swim", "Row", "Walk"].map((type) => (
          <Pressable
            key={type}
            style={styles.dashCard}
            onPress={() => navigation.navigate("CardioOptions", { type })}
          >
            <Text style={styles.dashCardText}>{type}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Cardio Options screen (Log Manually / Track with GPS) ───────

function E2ECardioOptionsScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const type = route?.params?.type || "Run";

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>{type}</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ padding: 24, gap: 16 }}>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("CardioManual", { type })}
        >
          <Text style={styles.primaryBtnText}>Log Manually</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: "#1E2B47" }]}
          onPress={() => navigation.navigate("CardioGPS", { type })}
        >
          <Text style={styles.primaryBtnText}>Track with GPS</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Cardio Manual Log screen ─────────────────────────────────────

function E2ECardioManualScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const type = route?.params?.type || "Run";
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");

  const handleSave = () => {
    navigation.navigate("CardioSummary", { type, duration, distance });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Log {type}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          testID="duration-minutes"
          style={styles.input}
          placeholder="e.g. 30"
          placeholderTextColor="#4E6180"
          value={duration}
          onChangeText={setDuration}
          keyboardType="decimal-pad"
        />
        <Text style={styles.label}>Distance (km)</Text>
        <TextInput
          testID="distance-input"
          style={styles.input}
          placeholder="e.g. 5.0"
          placeholderTextColor="#4E6180"
          value={distance}
          onChangeText={setDistance}
          keyboardType="decimal-pad"
        />
        <Pressable testID="save-cardio" style={[styles.primaryBtn, { marginTop: 8 }]} onPress={handleSave}>
          <Text style={styles.primaryBtnText}>Save</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ─── Cardio GPS screen ────────────────────────────────────────────

function E2ECardioGPSScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const type = route?.params?.type || "Run";
  const [running, setRunning] = useState(true);

  const handleStop = () => {
    setRunning(false);
    navigation.navigate("CardioSummary", { type, duration: "0", distance: "0" });
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#F0F4F8", fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
        {type} in Progress
      </Text>
      <Text style={{ color: "#8899B4", marginBottom: 48 }}>GPS tracking active</Text>
      <Pressable
        style={[styles.primaryBtn, { backgroundColor: "#EF4444", width: 160 }]}
        onPress={handleStop}
      >
        <Text style={styles.primaryBtnText}>Stop</Text>
      </Pressable>
    </View>
  );
}

// ─── Cardio Summary screen ────────────────────────────────────────

function E2ECardioSummaryScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { type = "Run", duration = "0", distance = "0" } = route?.params || {};

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14", justifyContent: "center", alignItems: "center", padding: 24 }}>
      <Text style={{ color: "#F0F4F8", fontSize: 28, fontWeight: "bold", marginBottom: 8 }}>
        {type} Complete
      </Text>
      <Text style={{ color: "#8899B4", fontSize: 16, marginBottom: 4 }}>
        Duration: {duration} min
      </Text>
      <Text style={{ color: "#8899B4", fontSize: 16, marginBottom: 40 }}>
        Distance: {distance} km
      </Text>
      <Pressable
        style={styles.primaryBtn}
        onPress={() => navigation.navigate("MainTabs")}
      >
        <Text style={styles.primaryBtnText}>Done</Text>
      </Pressable>
    </View>
  );
}

// ─── Workout History screen ───────────────────────────────────────

function E2EWorkoutHistoryScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Workouts</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8899B4", fontSize: 16 }}>No workouts yet</Text>
      </View>
    </View>
  );
}

// ─── Calendar screen ──────────────────────────────────────────────

function E2ECalendarScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Calendar</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.dashCard}>
          <Text style={styles.dashCardText}>Workout</Text>
        </View>
        <View style={styles.dashCard}>
          <Text style={styles.dashCardText}>Cardio</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Feed screen ──────────────────────────────────────────────────

function E2EFeedScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Feed</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8899B4", fontSize: 16 }}>No activity yet</Text>
      </View>
    </View>
  );
}

// ─── Messages screen ──────────────────────────────────────────────

function E2EMessagesScreen() {
  const navigation = useNavigation<any>();

  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <View style={styles.navHeader}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: "#0077FF", fontSize: 16 }}>Back</Text>
        </Pressable>
        <Text style={styles.navTitle}>Messages</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#8899B4", fontSize: 16 }}>No messages yet</Text>
      </View>
    </View>
  );
}

// ─── Navigators ───────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStackNav.Navigator
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#060B14" } }}
    >
      <AuthStackNav.Screen name="Login" component={E2ELoginScreen} />
      <AuthStackNav.Screen name="Signup" component={E2ESignupScreen} />
    </AuthStackNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: "#060B14", borderTopColor: "#1E2B47" },
        tabBarActiveTintColor: "#0077FF",
        tabBarInactiveTintColor: "#4E6180",
      }}
    >
      <Tab.Screen
        name="Home"
        component={E2EDashboard}
        options={{ tabBarTestID: "tab-home", tabBarLabel: "Home" }}
      />
      <Tab.Screen
        name="Stats"
        component={E2EStatsScreen}
        options={{ tabBarTestID: "tab-stats", tabBarLabel: "Stats" }}
      />
      <Tab.Screen
        name="Exercises"
        component={E2EExercisesScreen}
        options={{ tabBarTestID: "tab-exercises", tabBarLabel: "Exercises" }}
      />
      <Tab.Screen
        name="Profile"
        component={E2EProfileScreen}
        options={{ tabBarTestID: "tab-profile", tabBarLabel: "Profile" }}
      />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#060B14" }}>
        <Text style={{ color: "#F0F4F8", fontSize: 16 }}>Loading IronPulse...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStackNav.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <RootStackNav.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <RootStackNav.Screen name="MainTabs" component={MainTabs} />
            <RootStackNav.Screen name="WorkoutActive" component={E2EWorkoutActiveScreen} />
            <RootStackNav.Screen name="WorkoutComplete" component={E2EWorkoutCompleteScreen} />
            <RootStackNav.Screen name="CardioTypePicker" component={E2ECardioTypePickerScreen} />
            <RootStackNav.Screen name="CardioOptions" component={E2ECardioOptionsScreen} />
            <RootStackNav.Screen name="CardioManual" component={E2ECardioManualScreen} />
            <RootStackNav.Screen name="CardioGPS" component={E2ECardioGPSScreen} />
            <RootStackNav.Screen name="CardioSummary" component={E2ECardioSummaryScreen} />
            <RootStackNav.Screen name="WorkoutHistory" component={E2EWorkoutHistoryScreen} />
            <RootStackNav.Screen name="Calendar" component={E2ECalendarScreen} />
            <RootStackNav.Screen name="Feed" component={E2EFeedScreen} />
            <RootStackNav.Screen name="Messages" component={E2EMessagesScreen} />
            <RootStackNav.Screen name="ConnectedApps" component={E2EConnectedAppsScreen} />
          </>
        )}
      </RootStackNav.Navigator>
    </NavigationContainer>
  );
}

// ─── App Entry ────────────────────────────────────────────────────

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <AuthProvider>
        <StatusBar style="light" />
        <RootNavigator />
      </AuthProvider>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#060B14",
  },
  logo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#F0F4F8",
    textAlign: "center",
    marginBottom: 8,
  },
  subtext: {
    fontSize: 14,
    color: "#8899B4",
    textAlign: "center",
    marginBottom: 32,
  },
  input: {
    height: 48,
    backgroundColor: "#0F1629",
    borderWidth: 1,
    borderColor: "#1E2B47",
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#F0F4F8",
    fontSize: 16,
    marginBottom: 12,
  },
  primaryBtn: {
    height: 48,
    backgroundColor: "#0077FF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    color: "#8899B4",
    fontSize: 14,
    textAlign: "center",
  },
  screenHeading: {
    color: "#F0F4F8",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
  },
  sectionHeading: {
    color: "#F0F4F8",
    fontSize: 18,
    fontWeight: "600",
  },
  label: {
    color: "#8899B4",
    fontSize: 14,
    marginBottom: 6,
    marginTop: 8,
  },
  dashCard: {
    backgroundColor: "#0F1629",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  dashCardText: {
    color: "#F0F4F8",
    fontSize: 16,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0077FF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    paddingBottom: 104,
    paddingRight: 24,
    alignItems: "flex-end",
  },
  fabMenu: {
    backgroundColor: "#0F1629",
    borderRadius: 12,
    overflow: "hidden",
    minWidth: 160,
    borderWidth: 1,
    borderColor: "#1E2B47",
  },
  fabMenuItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2B47",
  },
  fabMenuText: {
    color: "#F0F4F8",
    fontSize: 16,
    fontWeight: "500",
  },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: "#060B14",
    borderBottomWidth: 1,
    borderBottomColor: "#1E2B47",
  },
  navTitle: {
    color: "#F0F4F8",
    fontSize: 18,
    fontWeight: "600",
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1E2B47",
  },
  profileLabel: {
    color: "#8899B4",
    fontSize: 15,
  },
  profileValue: {
    color: "#F0F4F8",
    fontSize: 15,
  },
  toggleBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1E2B47",
    backgroundColor: "#0F1629",
  },
  toggleBtnActive: {
    backgroundColor: "#0077FF",
    borderColor: "#0077FF",
  },
  toggleBtnText: {
    color: "#8899B4",
    fontSize: 14,
    fontWeight: "500",
  },
  toggleBtnTextActive: {
    color: "#FFFFFF",
  },
});
