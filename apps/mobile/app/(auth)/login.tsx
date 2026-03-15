import { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (error: any) {
      Alert.alert("Sign In Failed", error?.message ?? "Invalid credentials");
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
          IronPulse
        </Text>
        <Text style={{ color: "hsl(215, 20%, 65%)", marginBottom: 32 }}>
          Sign in to your account
        </Text>

        <View style={{ gap: 16 }}>
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button onPress={handleSignIn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </View>

        <Link href="/(auth)/signup" asChild>
          <Text
            style={{
              textAlign: "center",
              fontSize: 14,
              color: "hsl(215, 20%, 65%)",
              marginTop: 24,
            }}
          >
            Don't have an account?{" "}
            <Text style={{ color: "hsl(210, 40%, 98%)", fontWeight: "500" }}>
              Sign Up
            </Text>
          </Text>
        </Link>
      </View>
    </SafeAreaView>
  );
}
