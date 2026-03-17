import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SignupScreen() {
  const { signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password) return;
    setLoading(true);
    try {
      await signUp(name, email, password);
    } catch (error: any) {
      Alert.alert(
        "Sign Up Failed",
        error?.message ?? "Could not create account",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "hsl(224, 71%, 4%)" }}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "bold",
            color: "hsl(213, 31%, 91%)",
            marginBottom: 8,
          }}
        >
          Create Account
        </Text>
        <Text style={{ color: "hsl(215, 20%, 65%)", marginBottom: 32 }}>
          Start tracking your fitness
        </Text>

        <View style={{ gap: 16 }}>
          <Input label="Name" testID="name-input" value={name} onChangeText={setName} />
          <Input
            label="Email"
            testID="signup-email-input"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            testID="signup-password-input"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button onPress={handleSignUp} disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </View>

        <Link href="/(auth)/login" asChild>
          <Text
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "hsl(215, 20%, 65%)",
              marginTop: 24,
            }}
          >
            Already have an account?{" "}
            <Text style={{ color: "hsl(210, 40%, 98%)", fontWeight: "500" }}>
              Sign In
            </Text>
          </Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
