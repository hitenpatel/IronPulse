import { useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Mail } from "lucide-react-native";

import { trpc } from "../../lib/trpc";
import { colors, fonts, radii, typography } from "@/lib/theme";

export default function ForgotPasswordScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      await trpc.auth.requestPasswordReset.mutate({ email: email.trim() });
      setSent(true);
    } catch {
      // Always show success to avoid leaking email existence
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Mail size={32} color={colors.blue} style={{ alignSelf: "center" }} />
        <Text style={styles.heading}>Reset your password</Text>
        <Text style={styles.subtext} testID="forgot-status-text">
          {sent
            ? "If an account exists with that email, you'll receive a reset link."
            : "Enter your email and we'll send you a reset link."}
        </Text>

        {!sent && (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.text4}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="forgot-email-input"
            />
            <Pressable
              testID="forgot-submit-button"
              style={[styles.button, loading && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Text>
            </Pressable>
          </>
        )}

        <Pressable
          testID="forgot-back-button"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 16 }}
        >
          <Text style={styles.link}>Back to login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: colors.bg1,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 32,
  },
  heading: {
    fontFamily: fonts.displaySemi,
    fontWeight: "600",
    fontSize: typography.title.size,
    lineHeight: typography.title.lineHeight,
    color: colors.text,
    textAlign: "center",
    marginTop: 16,
  },
  subtext: {
    fontSize: typography.bodySmall.size,
    fontFamily: fonts.bodyRegular,
    color: colors.text3,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  input: {
    height: 48,
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.button,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: typography.body.size,
    fontFamily: fonts.bodyRegular,
  },
  button: {
    height: 48,
    backgroundColor: colors.blue, // lime primary
    borderRadius: radii.button,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: {
    color: colors.blueInk, // on-lime ink
    fontWeight: "600",
    fontSize: typography.body.size,
    fontFamily: fonts.bodySemi,
  },
  link: {
    color: colors.text2,
    fontSize: typography.bodySmall.size,
    fontFamily: fonts.bodyRegular,
    textAlign: "center",
  },
});
