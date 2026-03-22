/**
 * E2E App — full auth flow + navigation, but NO PowerSync-dependent screens.
 * This avoids the SharedArrayBuffer/.get() crash from PowerSync on Hermes.
 *
 * Auth screens work fully (login, signup, onboarding).
 * Post-auth screens show placeholder content (no data from PowerSync).
 */
import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./lib/auth";

// Auth screens — these have NO PowerSync imports
import LoginScreen from "./app/(auth)/login";
import SignupScreen from "./app/(auth)/signup";
import OnboardingScreen from "./app/(auth)/onboarding";
import ForgotPasswordScreen from "./app/(auth)/forgot-password";

import React from "react";

const AuthStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder dashboard for post-auth E2E tests
function E2EDashboard() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#060B14" }} contentContainerStyle={{ padding: 24, paddingTop: 64 }}>
      <Text style={{ color: "#F0F4F8", fontSize: 28, fontWeight: "bold" }}>Good morning</Text>
      <Text style={{ color: "#8899B4", fontSize: 14, marginBottom: 24 }}>E2E Test Mode — data stubs active</Text>
      <View style={{ backgroundColor: "#0F1629", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: "#F0F4F8", fontSize: 18, fontWeight: "600" }}>12 Day Streak</Text>
      </View>
      <View style={{ backgroundColor: "#0F1629", borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <Text style={{ color: "#F0F4F8", fontSize: 16 }}>No workouts yet</Text>
      </View>
    </ScrollView>
  );
}

function E2EPlaceholder({ title }: { title: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#060B14", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ color: "#F0F4F8", fontSize: 18 }}>{title}</Text>
      <Text style={{ color: "#8899B4", fontSize: 14 }}>E2E stub</Text>
    </View>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#060B14" } }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: "#060B14", borderTopColor: "#1E2B47" } }}>
      <Tab.Screen name="Home" component={E2EDashboard} options={{ title: "Home" }} />
      <Tab.Screen name="Stats" options={{ title: "Stats" }}>{() => <E2EPlaceholder title="Stats" />}</Tab.Screen>
      <Tab.Screen name="Exercises" options={{ title: "Exercises" }}>{() => <E2EPlaceholder title="Exercises" />}</Tab.Screen>
      <Tab.Screen name="Profile" options={{ title: "Profile" }}>{() => <E2EPlaceholder title="Profile" />}</Tab.Screen>
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#060B14" }}>
        <Text style={{ color: "#F0F4F8", fontSize: 16 }}>Loading IronPulse...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <RootStack.Screen name="MainTabs" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

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

export default function App() {
  return (
    <View style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </ErrorBoundary>
    </View>
  );
}
