import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { useAuth } from "@/lib/auth";
import { clearPowerSyncCache } from "@/lib/powersync";
import {
  getApiUrl,
  setApiUrl,
  validateServerUrl,
  type ServerValidationResult,
} from "@/lib/server";
import { Button, Card, Input } from "@/components/ui";
import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  border: theme.line,
  text: theme.text,
  textMuted: theme.text3,
  textFaint: theme.text4,
  error: theme.red,
};

const LABEL_STYLE = {
  fontSize: 12,
  color: colors.textFaint,
  textTransform: "uppercase" as const,
  fontWeight: "500" as const,
  letterSpacing: 1.2,
  marginBottom: 12,
};

export default function SettingsServerScreen() {
  const { signOut } = useAuth();
  const [url, setUrl] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUrl = getApiUrl();

  async function handleChangeServer() {
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

      Alert.alert(
        "Change Server?",
        "You'll be signed out and your locally cached data will be cleared. You'll need to sign in again on the new server.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Change Server",
            style: "destructive",
            onPress: async () => {
              try {
                await clearPowerSyncCache();
                await signOut();
                await setApiUrl(result.url);
              } catch {
                Alert.alert("Error", "Failed to switch servers. Please try again.");
              }
            },
          },
        ],
      );
    } catch {
      setError("Couldn't reach that address");
    } finally {
      setChecking(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      <Card style={{ gap: 12 }}>
        <Text style={LABEL_STYLE}>Current Server</Text>
        <Text testID="settings-server-current" style={{ color: colors.text, fontSize: 15 }}>
          {currentUrl}
        </Text>
      </Card>

      <Card style={{ gap: 12 }}>
        <Text style={LABEL_STYLE}>Change Server</Text>
        <Text style={{ color: colors.textMuted, fontSize: 13 }}>
          Point this app at a different self-hosted instance, or back at the
          managed cloud. This signs you out and clears the local cache — your
          data on the current server is untouched.
        </Text>
        <Input
          label="New server address"
          testID="settings-server-url-input"
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
          <Text testID="settings-server-error" style={{ color: colors.error, fontSize: 12.5 }}>
            {error}
          </Text>
        ) : null}
        <Button
          variant="destructive"
          testID="settings-server-change-button"
          onPress={handleChangeServer}
          disabled={checking}
        >
          {checking ? "Checking…" : "Change Server"}
        </Button>
      </Card>
    </ScrollView>
  );
}
