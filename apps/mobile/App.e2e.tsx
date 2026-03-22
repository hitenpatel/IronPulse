/**
 * Minimal E2E App — diagnose which import causes the .get() crash
 */
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";

// Minimal login screen with testID for Maestro
function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>IronPulse</Text>
      <Text style={styles.subtext}>E2E Test Mode</Text>
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
      <Pressable testID="login-button" style={styles.button}>
        <Text style={styles.buttonText}>Log In</Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: "#060B14" }}>
      <StatusBar style="light" />
      <LoginScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#060B14",
  },
  heading: {
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
  button: {
    height: 48,
    backgroundColor: "#0077FF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
