import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Config } from "@/lib/config";
import {
  setApiUrl,
  validateServerUrl,
  type ServerValidationResult,
} from "@/lib/server";
import { colors, fonts, tracking } from "@/lib/theme";
import { Button, Input, Logo } from "@/components/ui";

// Public docs for operators setting up their own instance. Not specified by
// the ticket beyond "opens docs" — this project's docs live on the same
// BookStack instance as everything else, so that's the reasonable default.
const SELF_HOST_DOCS_URL = "https://docs.hiten-patel.co.uk";

interface ServerPickerScreenProps {
  /** Called once a server URL has been chosen and persisted. */
  onServerReady: () => void;
}

type Mode = "choice" | "self-hosted";

export default function ServerPickerScreen({ onServerReady }: ServerPickerScreenProps) {
  const [mode, setMode] = useState<Mode>("choice");
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function commitAndContinue(chosenUrl: string) {
    await setApiUrl(chosenUrl);
    onServerReady();
  }

  async function handleUseCloud() {
    setChecking(true);
    setError(null);
    try {
      await commitAndContinue(Config.DEFAULT_API_URL);
    } finally {
      setChecking(false);
    }
  }

  async function handleValidateAndConnect() {
    if (!url.trim()) {
      setError("Enter a server address");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const result: ServerValidationResult = await validateServerUrl(url);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      await commitAndContinue(result.url);
    } catch {
      setError("Couldn't reach that address");
    } finally {
      setChecking(false);
    }
  }

  function handleLearnMore() {
    Linking.openURL(SELF_HOST_DOCS_URL);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 48, paddingBottom: 28 }}>
        <View style={{ alignItems: "center", marginBottom: 40 }}>
          <Logo size={80} />
          <Text
            style={{
              color: colors.text,
              fontSize: 22,
              fontFamily: fonts.displaySemi,
              marginTop: 16,
              textAlign: "center",
            }}
          >
            Where's your data?
          </Text>
          <Text
            style={{
              color: colors.text3,
              fontSize: 13,
              marginTop: 8,
              textAlign: "center",
              fontFamily: fonts.bodyRegular,
            }}
          >
            Zor works with the managed cloud, or with your own self-hosted
            instance.
          </Text>
        </View>

        {mode === "choice" ? (
          <View style={{ gap: 12 }} testID="server-picker-choice">
            <Button
              variant="primary"
              testID="server-picker-use-cloud"
              onPress={handleUseCloud}
              disabled={checking}
            >
              {checking ? "Connecting…" : "Use Zor Cloud"}
            </Button>
            <Button
              variant="ghost"
              testID="server-picker-self-hosted"
              onPress={() => {
                setError(null);
                setMode("self-hosted");
              }}
              disabled={checking}
            >
              Self-hosted (enter URL)
            </Button>
            <Pressable
              testID="server-picker-learn-more"
              onPress={handleLearnMore}
              style={{ marginTop: 8, alignSelf: "center" }}
            >
              <Text style={{ color: colors.blue2, fontSize: 13, fontFamily: fonts.bodySemi }}>
                Learn more about self-hosting
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 12 }} testID="server-picker-self-hosted-form">
            <Input
              label="Server address"
              testID="server-picker-url-input"
              value={url}
              onChangeText={(text) => {
                setUrl(text);
                setError(null);
              }}
              placeholder="myserver.example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!checking}
            />
            {error ? (
              <Text
                testID="server-picker-error"
                style={{ color: colors.red, fontSize: 12.5, fontFamily: fonts.bodyMedium }}
              >
                {error}
              </Text>
            ) : null}
            <Button
              variant="primary"
              testID="server-picker-connect"
              onPress={handleValidateAndConnect}
              disabled={checking}
            >
              {checking ? (
                <ActivityIndicator color={colors.blueInk} size="small" />
              ) : (
                "Connect"
              )}
            </Button>
            <Pressable
              testID="server-picker-back"
              onPress={() => {
                setError(null);
                setMode("choice");
              }}
              disabled={checking}
              style={{ alignSelf: "center", marginTop: 4 }}
            >
              <Text
                style={{
                  color: colors.text3,
                  fontSize: 12,
                  fontFamily: fonts.bodyMedium,
                  textTransform: "uppercase",
                  letterSpacing: tracking.caps,
                }}
              >
                Back
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
