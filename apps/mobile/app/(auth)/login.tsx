import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SafeAreaView } from "react-native-safe-area-context";
import { Dumbbell, Eye, EyeOff, Fingerprint } from "lucide-react-native";
import type { AuthStackParamList } from "../../App";
import * as AuthSession from "@/lib/auth-session";
import * as AppleAuthentication from "@/lib/apple-authentication";
import { useAuth } from "@/lib/auth";
import { isBiometricEnabled, isBiometricAvailable, getBiometricLabel } from "@/lib/biometric";
import { colors, fonts, radii, tracking } from "@/lib/theme";
import { Button, Input } from "@/components/ui";

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn, signInWithBiometric, signInWithOAuth } = useAuth();
  const googleDiscovery = AuthSession.useAutoDiscovery("https://accounts.google.com");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState("Biometric");

  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      const available = await isBiometricAvailable();
      if (enabled && available) {
        setBiometricLabel(await getBiometricLabel());
        setBiometricAvailable(true);
      }
    })();
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
      if (!success)
        Alert.alert("Authentication Failed", "Biometric authentication was not successful.");
    } catch (error: any) {
      Alert.alert("Authentication Failed", error?.message ?? "Could not authenticate.");
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
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* soft glow behind the logo */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 260,
          // v2 login glow — cobalt wash, matching the new logo's tile.
          backgroundColor: colors.greenSoft,
        }}
      />

      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 56, paddingBottom: 28 }}>
        {/* Logo + wordmark */}
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: colors.bg1,
              borderWidth: 1,
              borderColor: colors.line2,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
            }}
          >
            <Dumbbell size={26} color={colors.blue} />
          </View>
          <Text
            style={{
              fontFamily: fonts.displaySemi,
              fontSize: 30,
              letterSpacing: -0.8,
              color: colors.text,
            }}
          >
            Iron<Text style={{ color: colors.blue2 }}>Pulse</Text>
          </Text>
          <Text
            style={{
              color: colors.text3,
              fontSize: 12,
              marginTop: 6,
              fontFamily: fonts.bodyRegular,
            }}
          >
            Strength · Cardio · One place
          </Text>
        </View>

        {/* Inputs */}
        <View style={{ gap: 10, marginBottom: 14 }}>
          <Input
            label="Email"
            testID="email-input"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="you@example.com"
          />

          {/* Password with Forgot? link aligned to label row */}
          <View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: fonts.bodySemi,
                  textTransform: "uppercase",
                  letterSpacing: tracking.caps,
                  color: colors.text3,
                }}
              >
                Password
              </Text>
              <Pressable onPress={() => navigation.navigate("ForgotPassword")}>
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.blue2,
                    fontFamily: fonts.bodySemi,
                  }}
                >
                  Forgot?
                </Text>
              </Pressable>
            </View>
            <Input
              testID="password-input"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholder="••••••••"
              right={
                <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={6}>
                  {showPassword ? (
                    <EyeOff size={16} color={colors.text4} />
                  ) : (
                    <Eye size={16} color={colors.text4} />
                  )}
                </Pressable>
              }
            />
          </View>
        </View>

        <Button
          variant="primary"
          testID="login-button"
          onPress={handleSignIn}
          disabled={loading}
          style={{ marginBottom: 12 }}
        >
          {loading ? "Signing in…" : "Log in"}
        </Button>

        {biometricAvailable ? (
          <Pressable
            testID="biometric-signin-button"
            onPress={handleBiometricSignIn}
            disabled={loading}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 6,
              marginBottom: 8,
              opacity: loading ? 0.5 : 1,
            }}
          >
            <Fingerprint size={14} color={colors.text3} />
            <Text style={{ color: colors.text3, fontSize: 12, fontFamily: fonts.bodyMedium }}>
              Sign in with {biometricLabel}
            </Text>
          </Pressable>
        ) : null}

        {/* Divider */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            marginTop: 4,
            marginBottom: 14,
          }}
        >
          <View style={{ flex: 1, height: 1, backgroundColor: colors.lineSoft }} />
          <Text
            style={{
              color: colors.text4,
              fontSize: 10.5,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              fontFamily: fonts.bodyRegular,
            }}
          >
            or continue with
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: colors.lineSoft }} />
        </View>

        {/* OAuth buttons */}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="ghost"
              testID="google-signin-button"
              onPress={handleGoogleSignIn}
              disabled={loading || !GOOGLE_CLIENT_ID}
              style={{ opacity: loading || !GOOGLE_CLIENT_ID ? 0.5 : 1 }}
            >
              Google
            </Button>
          </View>

          <View style={{ flex: 1 }}>
            {Platform.OS === "ios" ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={radii.button}
                style={{ height: 44 }}
                onPress={handleAppleSignIn}
              />
            ) : (
              <Button variant="ghost" disabled style={{ opacity: 0.4 }}>
                Apple
              </Button>
            )}
          </View>
        </View>

        {/* Bottom sign-up link pushed to bottom */}
        <Pressable
          style={{ marginTop: "auto", paddingTop: 28 }}
          onPress={() => navigation.navigate("Signup")}
        >
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: colors.text3,
              fontFamily: fonts.bodyRegular,
            }}
          >
            Don't have an account?{" "}
            <Text style={{ color: colors.blue2, fontFamily: fonts.bodySemi }}>Sign up</Text>
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
