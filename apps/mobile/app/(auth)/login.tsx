import { useEffect, useState } from "react";
import { View, Text, Alert, Pressable, Platform } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fingerprint } from "lucide-react-native";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isBiometricEnabled, isBiometricAvailable, getBiometricLabel } from "@/lib/biometric";

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function LoginScreen() {
  const { signIn, signInWithBiometric, signInWithOAuth } = useAuth();
  const googleDiscovery = AuthSession.useAutoDiscovery("https://accounts.google.com");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometric");

  useEffect(() => {
    async function checkBiometric() {
      const enabled = await isBiometricEnabled();
      const available = await isBiometricAvailable();
      if (enabled && available) {
        const label = await getBiometricLabel();
        setBiometricLabel(label);
        setBiometricAvailable(true);
      }
    }
    checkBiometric();
  }, []);

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

  async function handleBiometricSignIn() {
    setLoading(true);
    try {
      const success = await signInWithBiometric();
      if (!success) {
        Alert.alert("Authentication Failed", "Biometric authentication was not successful.");
      }
    } catch (error: any) {
      Alert.alert("Authentication Failed", error?.message ?? "Could not authenticate with biometrics.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!googleDiscovery) return;
    setLoading(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({ scheme: "ironpulse" });
      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ["openid", "profile", "email"],
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
      });
      const result = await request.promptAsync(googleDiscovery);
      if (result.type === "success" && result.params.id_token) {
        await signInWithOAuth("google", result.params.id_token);
      }
    } catch (error: any) {
      Alert.alert("Google Sign-In Failed", error?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleAppleSignIn() {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (credential.identityToken) {
        const name = credential.fullName
          ? [credential.fullName.givenName, credential.fullName.familyName]
              .filter(Boolean)
              .join(" ") || undefined
          : undefined;
        await signInWithOAuth("apple", credential.identityToken, name, credential.email ?? undefined);
      }
    } catch (error: any) {
      if (error?.code !== "ERR_REQUEST_CANCELED") {
        Alert.alert("Apple Sign-In Failed", error?.message ?? "Something went wrong");
      }
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
            testID="email-input"
            accessibilityLabel="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Input
            label="Password"
            testID="password-input"
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <Button testID="signin-button" onPress={handleSignIn} disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>

          {biometricAvailable && (
            <Pressable
              testID="biometric-signin-button"
              accessibilityLabel={`Sign in with ${biometricLabel}`}
              onPress={handleBiometricSignIn}
              disabled={loading}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 12,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: "hsl(215, 20%, 65%)",
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Fingerprint size={20} color="hsl(213, 31%, 91%)" />
              <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
                Sign in with {biometricLabel}
              </Text>
            </Pressable>
          )}
          {/* OAuth Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "hsl(217, 33%, 17%)" }} />
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12, marginHorizontal: 12 }}>
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "hsl(217, 33%, 17%)" }} />
          </View>

          {/* Google Sign-In */}
          <Pressable
            testID="google-signin-button"
            onPress={handleGoogleSignIn}
            disabled={loading || !GOOGLE_CLIENT_ID}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 12,
              borderRadius: 8,
              borderWidth: 1,
              borderColor: "hsl(215, 20%, 65%)",
              opacity: loading || !GOOGLE_CLIENT_ID ? 0.5 : 1,
            }}
          >
            <Text style={{ color: "hsl(213, 31%, 91%)", fontWeight: "500" }}>
              Continue with Google
            </Text>
          </Pressable>

          {/* Apple Sign-In (iOS only) */}
          {Platform.OS === "ios" && (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={8}
              style={{ height: 48 }}
              onPress={handleAppleSignIn}
            />
          )}
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
