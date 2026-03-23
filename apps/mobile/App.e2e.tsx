/**
 * E2E App — full auth flow with inline screens (no external screen file imports
 * that pull in expo-auth-session/lucide which crash on Hermes).
 *
 * Uses AuthProvider for real login/signup via tRPC, but renders simple inline UI
 * instead of importing the complex auth screen components.
 */
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ScrollView, LogBox } from "react-native";

// Suppress LogBox warnings in E2E mode
LogBox.ignoreAllLogs(true);
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./lib/auth";

import React from "react";

const AuthStackNav = createNativeStackNavigator();
const RootStackNav = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Inline Auth Screens (no external deps that crash Hermes) ────

function E2ELoginScreen({ navigation }: any) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      Alert.alert("Login Failed", err?.message || "Check your credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.logo}>IronPulse</Text>
      <Text style={styles.subtext}>Strength + Cardio. One Tracker.</Text>
      <TextInput testID="email-input" style={styles.input} placeholder="Email" placeholderTextColor="#4E6180"
        value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextInput testID="password-input" style={styles.input} placeholder="Password" placeholderTextColor="#4E6180"
        value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable testID="login-button" style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
        <Text style={styles.primaryBtnText}>{loading ? "Signing in..." : "Log In"}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate("Signup")} style={{ marginTop: 16 }}>
        <Text style={styles.link}>Don't have an account? <Text style={{ color: "#0077FF", fontWeight: "600" }}>Sign up</Text></Text>
      </Pressable>
    </View>
  );
}

function E2ESignupScreen({ navigation }: any) {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignup = async () => {
    try {
      await signUp(name, email, password);
    } catch (err: any) {
      Alert.alert("Signup Failed", err?.message || "Try again");
    }
  };

  return (
    <View style={styles.authContainer}>
      <Text style={styles.logo}>Create Account</Text>
      <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#4E6180" value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#4E6180" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#4E6180" value={password} onChangeText={setPassword} secureTextEntry />
      <Pressable style={styles.primaryBtn} onPress={handleSignup}>
        <Text style={styles.primaryBtnText}>Create Account</Text>
      </Pressable>
      <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
        <Text style={styles.link}>Already have an account? <Text style={{ color: "#0077FF", fontWeight: "600" }}>Log in</Text></Text>
      </Pressable>
    </View>
  );
}

// ─── Inline Post-Auth Screens (stubs) ────────────────────────────

function E2EDashboard() {
  const { user, signOut } = useAuth();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#060B14" }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ color: "#F0F4F8", fontSize: 28, fontWeight: "bold" }}>Good morning{user?.name ? `, ${user.name}` : ""}</Text>
      <Text style={{ color: "#8899B4", fontSize: 14, marginBottom: 24 }}>E2E Test Mode</Text>
      <View style={{ backgroundColor: "#0F1629", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: "#F0F4F8", fontSize: 18, fontWeight: "600" }}>12 Day Streak</Text>
      </View>
      <View style={{ backgroundColor: "#0F1629", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: "#F0F4F8" }}>No workouts yet</Text>
      </View>
      <Pressable onPress={signOut} style={{ marginTop: 32 }}>
        <Text style={{ color: "#EF4444", textAlign: "center" }}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

function Placeholder({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#060B14", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#F0F4F8", fontSize: 18 }}>{title}</Text>
    </View>
  );
}

// ─── Navigators ──────────────────────────────────────────────────

function AuthNavigator() {
  return (
    <AuthStackNav.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#060B14" } }}>
      <AuthStackNav.Screen name="Login" component={E2ELoginScreen} />
      <AuthStackNav.Screen name="Signup" component={E2ESignupScreen} />
    </AuthStackNav.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: "#060B14", borderTopColor: "#1E2B47" } }}>
      <Tab.Screen name="Home" component={E2EDashboard} />
      <Tab.Screen name="Stats">{() => <Placeholder title="Stats" />}</Tab.Screen>
      <Tab.Screen name="Exercises">{() => <Placeholder title="Exercises" />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <Placeholder title="Profile" />}</Tab.Screen>
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
          <RootStackNav.Screen name="MainTabs" component={MainTabs} />
        )}
      </RootStackNav.Navigator>
    </NavigationContainer>
  );
}

// ─── Error Boundary ──────────────────────────────────────────────

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  state = { error: null as any };
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#060B14", padding: 20 }}>
          <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>App Error</Text>
          <Text style={{ color: "#F0F4F8", fontSize: 14 }} testID="error-message">{String(this.state.error?.message || this.state.error)}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── App Entry ───────────────────────────────────────────────────

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

// ─── Styles ──────────────────────────────────────────────────────

const styles = StyleSheet.create({
  authContainer: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#060B14" },
  logo: { fontSize: 28, fontWeight: "bold", color: "#F0F4F8", textAlign: "center", marginBottom: 8 },
  subtext: { fontSize: 14, color: "#8899B4", textAlign: "center", marginBottom: 32 },
  input: { height: 48, backgroundColor: "#0F1629", borderWidth: 1, borderColor: "#1E2B47", borderRadius: 8, paddingHorizontal: 16, color: "#F0F4F8", fontSize: 16, marginBottom: 12 },
  primaryBtn: { height: 48, backgroundColor: "#0077FF", borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 8 },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
  link: { color: "#8899B4", fontSize: 14, textAlign: "center" },
});
