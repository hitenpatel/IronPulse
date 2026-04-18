import { useState } from "react";
import { View, Text, Alert, Linking, Pressable, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AuthStackParamList } from "../../App";
import * as AuthSession from "@/lib/auth-session";
import * as AppleAuthentication from "@/lib/apple-authentication";
import { useAuth } from "@/lib/auth";
import { Config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

function PasswordStrengthBar({ password }: { password: string }) {
  const strength = (() => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return score;
  })();

  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  const colors = ["transparent", "#EF4444", "#F59E0B", "#22C55E", "#0077FF"];

  if (!password) return null;

  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1, 2, 3, 4].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= strength ? colors[strength] : C.border,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: strength > 0 ? colors[strength] : C.textSecondary }}>
        {labels[strength]}
      </Text>
    </View>
  );
}

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp, signInWithOAuth } = useAuth();
  const googleDiscovery = AuthSession.useAutoDiscovery("https://accounts.google.com");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp() {
    if (!name || !email || !password) return;
    if (password !== confirmPassword) {
      Alert.alert("Sign Up Failed", "Passwords do not match");
      return;
    }
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
        {/* Logo */}
        <View style={{ alignItems: "center", marginBottom: 32 }}>
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
        </View>

        {/* Heading */}
        <Text
          style={{
            fontSize: 24,
            fontWeight: "700",
            color: C.text,
            marginBottom: 24,
            fontFamily: "SpaceGrotesk-Bold",
          }}
        >
          Create your account
        </Text>

        <View style={{ gap: 16 }}>
          <Input
            label="Name"
            testID="name-input"
            value={name}
            onChangeText={setName}
            placeholder="Your full name"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Input
            label="Email"
            testID="signup-email-input"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
          />
          <View style={{ gap: 8 }}>
            <Input
              label="Password"
              testID="signup-password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />
            <PasswordStrengthBar password={password} />
          </View>
          <Input
            label="Confirm Password"
            testID="signup-confirm-password-input"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="••••••••"
          />

          <Button onPress={handleSignUp} disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </Button>

          {/* GDPR consent notice — links to hosted privacy + terms pages */}
          <Text
            style={{
              color: C.textSecondary,
              fontSize: 12,
              textAlign: "center",
              lineHeight: 18,
              marginTop: 2,
            }}
          >
            By creating an account you agree to our{" "}
            <Text
              style={{ color: C.primary, textDecorationLine: "underline" }}
              onPress={() => Linking.openURL(`${Config.API_URL}/terms`)}
              testID="signup-terms-link"
            >
              Terms
            </Text>
            {" and "}
            <Text
              style={{ color: C.primary, textDecorationLine: "underline" }}
              onPress={() => Linking.openURL(`${Config.API_URL}/privacy`)}
              testID="signup-privacy-link"
            >
              Privacy Policy
            </Text>
            .
          </Text>

          {/* Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
            <Text style={{ color: C.textSecondary, fontSize: 12, marginHorizontal: 12 }}>
              or sign up with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: C.border }} />
          </View>

          {/* Social buttons — side by side */}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              testID="google-signup-button"
              onPress={async () => {
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
                  Alert.alert("Google Sign-Up Failed", error?.message ?? "Something went wrong");
                } finally {
                  setLoading(false);
                }
              }}
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
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={8}
                style={{ flex: 1, height: 48 }}
                onPress={async () => {
                  setLoading(true);
                  try {
                    const credential = await AppleAuthentication.signInAsync({
                      requestedScopes: [
                        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                        AppleAuthentication.AppleAuthenticationScope.EMAIL,
                      ],
                    });
                    if (credential.identityToken) {
                      const fullName = credential.fullName
                        ? [credential.fullName.givenName, credential.fullName.familyName]
                            .filter(Boolean)
                            .join(" ") || undefined
                        : undefined;
                      await signInWithOAuth("apple", credential.identityToken, fullName, credential.email ?? undefined);
                    }
                  } catch (error: any) {
                    if (error?.code !== "ERR_REQUEST_CANCELED") {
                      Alert.alert("Apple Sign-Up Failed", error?.message ?? "Something went wrong");
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
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

        {/* Bottom log-in link */}
        <Pressable style={{ marginTop: 28 }} onPress={() => navigation.navigate("Login")}>
          <Text
            style={{
              textAlign: "center",
              fontSize: 14,
              color: C.textSecondary,
            }}
          >
            Already have an account?{" "}
            <Text style={{ color: C.primary, fontWeight: "600" }}>Log in</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
