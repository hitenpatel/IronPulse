/**
 * E2E-only App entry — uses only auth screens, no PowerSync dependency chain.
 * This avoids the SharedArrayBuffer crash on Hermes Android debug builds.
 */
import { useState } from "react";
import { View, Text } from "react-native";
// GestureHandlerRootView removed for E2E — not needed for auth flows
// and gesture-handler 2.30 may have Map.get() crash on Hermes
const GestureHandlerRootView = ({ children, style }: any) => (
  <View style={style}>{children}</View>
);
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./lib/auth";

// Auth screens only — no PowerSync imports
import LoginScreen from "./app/(auth)/login";
import SignupScreen from "./app/(auth)/signup";
import OnboardingScreen from "./app/(auth)/onboarding";
import ForgotPasswordScreen from "./app/(auth)/forgot-password";

import React from "react";

const Stack = createNativeStackNavigator();

function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#060B14" } }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <AuthProvider>
          <StatusBar style="light" />
          <RootNavigator />
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
