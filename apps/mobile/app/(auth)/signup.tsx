import { useState } from "react";
import { View, Text, Alert, Pressable, Platform } from "react-native";
import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as AuthSession from "expo-auth-session";
import * as AppleAuthentication from "expo-apple-authentication";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";

export default function SignupScreen() {
  const { signUp, signInWithOAuth } = useAuth();
  const googleDiscovery = AuthSession.useAutoDiscovery("https://accounts.google.com");
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

          {/* OAuth Divider */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: "hsl(217, 33%, 17%)" }} />
            <Text style={{ color: "hsl(215, 20%, 65%)", fontSize: 12, marginHorizontal: 12 }}>
              or sign up with
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: "hsl(217, 33%, 17%)" }} />
          </View>

          {/* Google Sign-In */}
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
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
              buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
              cornerRadius={8}
              style={{ height: 48 }}
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
          )}
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
