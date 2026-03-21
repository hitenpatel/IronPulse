import { useEffect, useState } from "react";
import { View, Text, Alert, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AuthStackParamList } from "../../App";
import { Fingerprint } from "lucide-react-native";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isBiometricEnabled, isBiometricAvailable, getBiometricLabel } from "@/lib/biometric";

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

// Pulse design system tokens
const C = {
  bg: "#060B14",
  card: "#0F1629",
  primary: "#0077FF",
  primaryMuted: "rgba(0, 119, 255, 0.10)",
  border: "#1E2B47",
  text: "#F0F4F8",
  textSecondary: "#4E6180",
};

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
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
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Gradient glow at top */}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 220,
          backgroundColor: C.primaryMuted,
          opacity: 0.6,
        }}
        pointerEvents="none"
      />

      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
        {/* Logo + tagline */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Text
            style={{
              fontSize: 32,
              fontWeight: "800",
              color: C.text,
              letterSpacing: -0.5,
              fontFamily: "SpaceGrotesk-Bold",
            }}
          >
            IronPulse
          </Text>
          <Text style={{ color: C.textSecondary, fontSize: 13, marginTop: 6 }}>
            Strength + Cardio. One Tracker.
          </Text>
        </View>

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
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            testID="password-input"
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          {/* Forgot password */}
          <Pressable
            style={{ alignSelf: "flex-end", marginTop: -4 }}
            onPress={() => navigation.navigate("ForgotPassword")}
          >
            <Text style={{ fontSize: 13, color: C.primary, fontWeight: "500" }}>
              Forgot password?
            </Text>
          </Pressable>

          <Button testID="login-button" onPress={handleSignIn} disabled={loading}>
            {loading ? "Signing in..." : "Log In"}
          </Button>

          {/* Passkey / biometric link */}
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
                gap: 6,
                paddingVertical: 4,
                opacity: loading ? 0.5 : 1,
              }}
            >
              <Fingerprint size={16} color={C.textSecondary} />
              <Text style={{ color: C.textSecondary, fontSize: 13 }}>
                Sign in with {biometricLabel}
              </Text>
            </Pressable>
          )}

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ color: C.textSecondary, fontSize: 12, marginHorizontal: 12 }}>
              or continue with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          {/* Social buttons — side by side */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              testID="google-signin-button"
              onPress={handleGoogleSignIn}
              disabled={loading || !GOOGLE_CLIENT_ID}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 48,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: C.border,
                backgroundColor: "transparent",
                opacity: loading || !GOOGLE_CLIENT_ID ? 0.5 : 1,
              }}
            >
              <Text style={{ color: C.text, fontWeight: "600", fontSize: 14 }}>
                Google
              </Text>
            </Pressable>

            {Platform.OS === "ios" ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={8}
                style={{ flex: 1, height: 48 }}
                onPress={handleAppleSignIn}
              />
            ) : (
              <Pressable
                disabled
                style={{
                  flex: 1,
                  height: 48,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: C.border,
                  backgroundColor: "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.3,
                }}
              >
                <Text style={{ color: C.text, fontWeight: "600", fontSize: 14 }}>
                  Apple
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* Bottom sign-up link */}
        <Pressable style={{ marginTop: 28 }} onPress={() => navigation.navigate("Signup")}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 14,
              color: C.textSecondary,
            }}
          >
            Don't have an account?{" "}
            <Text style={{ color: C.primary, fontWeight: "600" }}>Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
