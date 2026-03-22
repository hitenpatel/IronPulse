/**
 * E2E diagnostic — Step 2: Navigation + AuthProvider (no real auth screens)
 */
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { AuthProvider, useAuth } from "./lib/auth";

const Stack = createNativeStackNavigator();

function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>IronPulse</Text>
      <Text style={styles.subtext}>E2E Auth Test</Text>
      <TextInput testID="email-input" style={styles.input} placeholder="Email" placeholderTextColor="#4E6180" />
      <TextInput testID="password-input" style={styles.input} placeholder="Password" placeholderTextColor="#4E6180" secureTextEntry />
      <Pressable testID="login-button" style={styles.button}>
        <Text style={styles.buttonText}>Log In</Text>
      </Pressable>
    </View>
  );
}

function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={{ color: "#F0F4F8", fontSize: 28, fontWeight: "bold" }}>Good morning</Text>
    </View>
  );
}

function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#060B14" }}>
        <Text style={{ color: "#F0F4F8" }}>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

import React from "react";
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: any}> {
  state = { error: null as any };
  static getDerivedStateFromError(error: any) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#060B14", padding: 20 }}>
          <Text style={{ color: "#EF4444", fontSize: 18, fontWeight: "bold" }}>App Error</Text>
          <Text style={{ color: "#F0F4F8", fontSize: 14 }} testID="error-message">{String(this.state.error?.message || this.state.error)}</Text>
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

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#060B14" },
  heading: { fontSize: 28, fontWeight: "bold", color: "#F0F4F8", textAlign: "center", marginBottom: 8 },
  subtext: { fontSize: 14, color: "#8899B4", textAlign: "center", marginBottom: 32 },
  input: { height: 48, backgroundColor: "#0F1629", borderWidth: 1, borderColor: "#1E2B47", borderRadius: 8, paddingHorizontal: 16, color: "#F0F4F8", fontSize: 16, marginBottom: 12 },
  button: { height: 48, backgroundColor: "#0077FF", borderRadius: 8, justifyContent: "center", alignItems: "center", marginTop: 8 },
  buttonText: { color: "#FFFFFF", fontWeight: "600", fontSize: 16 },
});
