import { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { Mail } from "lucide-react-native";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = () => {
    // TODO: integrate with auth API
    setSent(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Mail size={32} color="#0077FF" style={{ alignSelf: "center" }} />
        <Text style={styles.heading}>Reset your password</Text>
        <Text style={styles.subtext}>
          {sent
            ? "Check your email for a reset link."
            : "Enter your email and we'll send you a reset link."}
        </Text>

        {!sent && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#4E6180"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="forgot-email-input"
            />
            <Pressable style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Send Reset Link</Text>
            </Pressable>
          </>
        )}

        <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={styles.link}>Back to login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#060B14",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#0F1629",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1E2B47",
    padding: 32,
  },
  heading: {
    fontFamily: "ClashDisplay",
    fontWeight: "600",
    fontSize: 22,
    color: "#F0F4F8",
    textAlign: "center",
    marginTop: 16,
  },
  subtext: {
    fontSize: 14,
    color: "#8899B4",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
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
  },
  button: {
    height: 48,
    backgroundColor: "#0077FF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
  link: {
    color: "#0077FF",
    fontSize: 14,
    textAlign: "center",
  },
});
