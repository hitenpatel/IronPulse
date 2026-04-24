import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  Activity,
  Check,
  Cloud,
  Heart,
  RefreshCw,
  Scale,
  Zap,
} from "lucide-react-native";
import { usePowerSync } from "@powersync/react";

import { useAuth } from "@/lib/auth";
import { trpc } from "@/lib/trpc";
import {
  isHealthKitAvailable,
  isHealthKitConnected,
  setHealthKitEnabled,
  requestPermissions,
  syncFromHealthKit,
  getLastSyncTimestamp,
} from "@/lib/healthkit";
import {
  isGoogleFitAvailable,
  isGoogleFitConnected,
  setGoogleFitEnabled,
  authorizeGoogleFit,
  syncFromGoogleFit,
  getGoogleFitLastSync,
} from "@/lib/googlefit";
import { Config } from "@/lib/config";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { BigNum, Button, Chip, TopBar, UppercaseLabel } from "@/components/ui";

const API_BASE_URL = Config.API_URL;

interface Connection {
  id: string;
  provider: string;
  providerAccountId: string;
  lastSyncedAt: string | null;
  syncEnabled: boolean;
  createdAt: string;
}

type ProviderKey =
  | "strava"
  | "garmin"
  | "polar"
  | "oura"
  | "withings"
  | "intervals_icu"
  | "apple_health"
  | "google_fit";

interface ProviderMeta {
  key: ProviderKey;
  name: string;
  subtitle: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  /** How the provider authenticates. */
  auth: "oauth" | "apikey" | "native";
  /** Platform gate — if set, only render on this platform. */
  platform?: "ios" | "android";
}

// Provider catalog — colour is the brand-adjacent accent (cobalt for blue
// fitness services, red for HR/Apple Health, etc.). All accents come from
// tokens so the redesign palette drives everything.
// Garmin Connect hidden from the catalog — partner approval pipeline is
// multi-week, not viable for launch. Backend routes remain intact so any
// existing connections keep working; users can use Intervals.icu as a
// stopgap (it pulls from Garmin Connect upstream).
const PROVIDERS: ProviderMeta[] = [
  { key: "strava", name: "Strava", subtitle: "Runs · rides · workouts", Icon: Activity, color: colors.orange, auth: "oauth" },
  { key: "polar", name: "Polar", subtitle: "Heart rate · recovery", Icon: Heart, color: colors.red, auth: "oauth" },
  { key: "oura", name: "Oura", subtitle: "Sleep · readiness · HRV", Icon: Zap, color: colors.purple, auth: "oauth" },
  { key: "withings", name: "Withings", subtitle: "Weight · body fat · BMI", Icon: Scale, color: colors.green, auth: "oauth" },
  { key: "intervals_icu", name: "Intervals.icu", subtitle: "Training analytics", Icon: Activity, color: colors.cyan, auth: "apikey" },
  { key: "apple_health", name: "Apple Health", subtitle: "Sync all health data", Icon: Heart, color: colors.red, auth: "native", platform: "ios" },
  { key: "google_fit", name: "Google Fit", subtitle: "Google fitness platform", Icon: Cloud, color: colors.green, auth: "native", platform: "android" },
];

function formatLastSync(iso: string | null | undefined): string {
  if (!iso) return "Not yet synced";
  const date = new Date(iso);
  const now = Date.now();
  const diffMin = Math.floor((now - date.getTime()) / 60000);
  if (diffMin < 1) return "Synced just now";
  if (diffMin < 60) return `Synced ${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `Synced ${diffHr}h ago`;
  return `Synced ${date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export default function IntegrationsScreen() {
  const navigation = useNavigation();
  const db = usePowerSync();
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<ProviderKey | null>(null);

  // Native integration state
  const [hkAvailable, setHkAvailable] = useState(false);
  const [hkConnected, setHkConnected] = useState(false);
  const [hkLastSync, setHkLastSync] = useState<string | null>(null);
  const [gfAvailable, setGfAvailable] = useState(false);
  const [gfConnected, setGfConnected] = useState(false);
  const [gfLastSync, setGfLastSync] = useState<string | null>(null);

  // Intervals.icu direct-credential form state
  const [icuFormOpen, setIcuFormOpen] = useState(false);
  const [icuAthleteId, setIcuAthleteId] = useState("");
  const [icuApiKey, setIcuApiKey] = useState("");

  // ─── effects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    (async () => {
      const available = await isHealthKitAvailable();
      setHkAvailable(available);
      if (available) {
        setHkConnected(await isHealthKitConnected());
        setHkLastSync(await getLastSyncTimestamp());
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    (async () => {
      const available = isGoogleFitAvailable();
      setGfAvailable(available);
      if (available) {
        setGfConnected(await isGoogleFitConnected());
        setGfLastSync(await getGoogleFitLastSync());
      }
    })();
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      const result = await trpc.integration.listConnections.query();
      // tRPC returns Date on the timestamp columns; the row shape otherwise
      // matches Connection. Cast via unknown to relax the nominal check.
      setConnections(result as unknown as Connection[]);
    } catch {
      /* stale */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // ─── handlers ────────────────────────────────────────────────────────
  const handleHealthKitToggle = async (next: boolean) => {
    setBusyProvider("apple_health");
    try {
      if (next) {
        // requestPermissions returns void on success and throws when the user
        // declines; we let the sync call surface any granularity loss.
        await requestPermissions();
        await setHealthKitEnabled(true);
        await syncFromHealthKit(db, user!.id);
        setHkConnected(true);
        setHkLastSync(new Date().toISOString());
      } else {
        await setHealthKitEnabled(false);
        setHkConnected(false);
        setHkLastSync(null);
      }
    } catch (err: any) {
      Alert.alert("Apple Health", err?.message ?? "Could not enable Apple Health.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleGoogleFitToggle = async (next: boolean) => {
    setBusyProvider("google_fit");
    try {
      if (next) {
        const authorized = await authorizeGoogleFit();
        if (authorized) {
          await setGoogleFitEnabled(true);
          await syncFromGoogleFit(db, user!.id);
          setGfConnected(true);
          setGfLastSync(new Date().toISOString());
        } else {
          Alert.alert(
            "Google Fit",
            "Authorisation was denied or cancelled. Ensure this build's SHA-1 cert is registered as an Android OAuth client in Google Cloud Console.",
          );
        }
      } else {
        await setGoogleFitEnabled(false);
        setGfConnected(false);
        setGfLastSync(null);
      }
    } catch (err: any) {
      Alert.alert("Google Fit", err?.message ?? "Authorisation failed.");
    } finally {
      setBusyProvider(null);
    }
  };

  const handleOAuthConnect = (provider: ProviderKey) => {
    Linking.openURL(`${API_BASE_URL}/api/${provider.replace("_", "-")}/connect`);
  };

  const confirmDisconnect = (provider: ProviderKey, label: string) => {
    Alert.alert("Disconnect", `Disconnect ${label}? History will be retained.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: async () => {
          setBusyProvider(provider);
          try {
            await trpc.integration.disconnectProvider.mutate({
              provider: provider as "strava" | "garmin" | "polar" | "oura" | "withings" | "intervals_icu" | "apple_health",
            });
            await fetchConnections();
          } finally {
            setBusyProvider(null);
          }
        },
      },
    ]);
  };

  const handleIntervalsConnect = async () => {
    if (!icuAthleteId.trim() || !icuApiKey.trim()) return;
    setBusyProvider("intervals_icu");
    try {
      await trpc.integration.completeIntervalsIcuAuth.mutate({
        athleteId: icuAthleteId.trim(),
        apiKey: icuApiKey.trim(),
      });
      setIcuAthleteId("");
      setIcuApiKey("");
      setIcuFormOpen(false);
      await fetchConnections();
    } catch (err: any) {
      Alert.alert("Intervals.icu", err?.message ?? "Please check your credentials.");
    } finally {
      setBusyProvider(null);
    }
  };

  // ─── derived state ──────────────────────────────────────────────────
  const connectedProviders: Array<{ meta: ProviderMeta; lastSync: string | null }> = [];
  const availableProviders: ProviderMeta[] = [];

  for (const p of PROVIDERS) {
    if (p.platform && p.platform !== Platform.OS) continue;
    if (p.key === "apple_health") {
      if (hkConnected) connectedProviders.push({ meta: p, lastSync: hkLastSync });
      else if (hkAvailable) availableProviders.push(p);
      continue;
    }
    if (p.key === "google_fit") {
      if (gfConnected) connectedProviders.push({ meta: p, lastSync: gfLastSync });
      else if (gfAvailable) availableProviders.push(p);
      continue;
    }
    const conn = connections.find((c) => c.provider === p.key);
    if (conn) connectedProviders.push({ meta: p, lastSync: conn.lastSyncedAt });
    else availableProviders.push(p);
  }

  // Pick a "featured" device for the hero card — prefer a native integration
  // (HK/GF) since they carry live metrics, else the most recently synced
  // OAuth connection.
  const featured = connectedProviders.find((p) => p.meta.auth === "native") ?? connectedProviders[0];

  // ─── render ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: spacing.gutter, paddingBottom: 32 }}>
        <TopBar title="Connected apps" onBack={() => navigation.goBack()} />

        {loading ? (
          <ActivityIndicator color={colors.text3} style={{ marginVertical: 24 }} />
        ) : (
          <>
            {/* Active device hero */}
            {featured ? <FeaturedDevice featured={featured} /> : null}

            {/* Connected list */}
            {connectedProviders.length > 0 ? (
              <View style={{ marginBottom: 14 }}>
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 6,
                  }}
                >
                  <UppercaseLabel>Connected · {connectedProviders.length}</UppercaseLabel>
                </View>
                <View
                  style={{
                    backgroundColor: colors.bg1,
                    borderWidth: 1,
                    borderColor: colors.lineSoft,
                    borderRadius: radii.rowList,
                    overflow: "hidden",
                  }}
                >
                  {connectedProviders.map(({ meta, lastSync }, i) => (
                    <ConnectedRow
                      key={meta.key}
                      meta={meta}
                      lastSync={lastSync}
                      busy={busyProvider === meta.key}
                      isFirst={i === 0}
                      onToggle={(next) => {
                        if (meta.key === "apple_health") void handleHealthKitToggle(next);
                        else if (meta.key === "google_fit") void handleGoogleFitToggle(next);
                        else if (!next) confirmDisconnect(meta.key, meta.name);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {/* Intervals.icu API-key form (shown when user taps Connect) */}
            {icuFormOpen ? (
              <View
                style={{
                  backgroundColor: colors.bg1,
                  borderWidth: 1,
                  borderColor: colors.lineSoft,
                  borderRadius: radii.card,
                  padding: 14,
                  marginBottom: 14,
                  gap: 10,
                }}
              >
                <UppercaseLabel>Intervals.icu credentials</UppercaseLabel>
                <TextInput
                  placeholder="Athlete ID"
                  placeholderTextColor={colors.text4}
                  value={icuAthleteId}
                  onChangeText={setIcuAthleteId}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={inputStyle}
                />
                <TextInput
                  placeholder="API key"
                  placeholderTextColor={colors.text4}
                  value={icuApiKey}
                  onChangeText={setIcuApiKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  style={inputStyle}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Button
                      variant="primary"
                      onPress={handleIntervalsConnect}
                      disabled={
                        busyProvider === "intervals_icu" ||
                        !icuAthleteId.trim() ||
                        !icuApiKey.trim()
                      }
                    >
                      {busyProvider === "intervals_icu" ? "Connecting…" : "Connect"}
                    </Button>
                  </View>
                  <Button
                    variant="ghost"
                    onPress={() => setIcuFormOpen(false)}
                    style={{ paddingHorizontal: 18 }}
                  >
                    Cancel
                  </Button>
                </View>
              </View>
            ) : null}

            {/* Available list */}
            {availableProviders.length > 0 ? (
              <View style={{ marginBottom: 14 }}>
                <UppercaseLabel style={{ marginBottom: 6 }}>Available</UppercaseLabel>
                <View
                  style={{
                    backgroundColor: colors.bg1,
                    borderWidth: 1,
                    borderColor: colors.lineSoft,
                    borderRadius: radii.rowList,
                    overflow: "hidden",
                  }}
                >
                  {availableProviders.map((p, i) => (
                    <AvailableRow
                      key={p.key}
                      meta={p}
                      busy={busyProvider === p.key}
                      isFirst={i === 0}
                      onConnect={() => {
                        if (p.key === "apple_health") void handleHealthKitToggle(true);
                        else if (p.key === "google_fit") void handleGoogleFitToggle(true);
                        else if (p.key === "intervals_icu") setIcuFormOpen(true);
                        else handleOAuthConnect(p.key);
                      }}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <Text
              style={{
                color: colors.text4,
                fontSize: 11,
                fontFamily: fonts.bodyRegular,
                textAlign: "center",
                marginTop: 8,
              }}
            >
              OAuth connections redirect you to {new URL(API_BASE_URL).host} to authorise.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── subcomponents ────────────────────────────────────────────────────────

const inputStyle = {
  backgroundColor: colors.bg2,
  borderWidth: 1,
  borderColor: colors.line,
  borderRadius: radii.button,
  paddingHorizontal: 12,
  paddingVertical: 10,
  color: colors.text,
  fontSize: 13,
  fontFamily: fonts.bodyRegular,
};

function FeaturedDevice({
  featured,
}: {
  featured: { meta: ProviderMeta; lastSync: string | null };
}) {
  const { meta, lastSync } = featured;
  const Icon = meta.Icon;
  return (
    <View
      style={{
        backgroundColor: colors.greenSoft,
        borderWidth: 1,
        borderColor: colors.greenSoft,
        borderRadius: radii.card,
        padding: 14,
        marginBottom: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: meta.color + "22",
            borderWidth: 1,
            borderColor: meta.color + "55",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon size={18} color={meta.color} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontSize: 13.5,
              fontFamily: fonts.bodySemi,
              color: colors.text,
            }}
          >
            {meta.name}
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 4,
              marginTop: 2,
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: colors.green,
              }}
            />
            <Text
              style={{
                fontSize: 10.5,
                color: colors.text3,
                fontFamily: fonts.bodyRegular,
              }}
            >
              {formatLastSync(lastSync)}
            </Text>
          </View>
        </View>
        <Chip tone="green" dot>
          Active
        </Chip>
      </View>

      <Text
        style={{
          fontSize: 11.5,
          color: colors.text3,
          fontFamily: fonts.bodyRegular,
          lineHeight: 16,
        }}
      >
        {meta.subtitle}
      </Text>
    </View>
  );
}

function ConnectedRow({
  meta,
  lastSync,
  busy,
  isFirst,
  onToggle,
}: {
  meta: ProviderMeta;
  lastSync: string | null;
  busy: boolean;
  isFirst: boolean;
  onToggle: (next: boolean) => void;
}) {
  const Icon = meta.Icon;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: spacing.rowPaddingY,
        paddingHorizontal: spacing.rowPaddingX,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: colors.lineSoft,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: meta.color + "22",
          borderWidth: 1,
          borderColor: meta.color + "55",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={meta.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            color: colors.text,
            fontFamily: fonts.bodyMedium,
          }}
        >
          {meta.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10.5,
            color: colors.text3,
            marginTop: 1,
            fontFamily: fonts.bodyRegular,
          }}
        >
          {formatLastSync(lastSync)}
        </Text>
      </View>
      {busy ? (
        <ActivityIndicator size="small" color={colors.text3} />
      ) : (
        <Switch
          value={true}
          onValueChange={onToggle}
          trackColor={{ false: colors.bg3, true: colors.blue }}
          thumbColor={colors.text}
        />
      )}
    </View>
  );
}

function AvailableRow({
  meta,
  busy,
  isFirst,
  onConnect,
}: {
  meta: ProviderMeta;
  busy: boolean;
  isFirst: boolean;
  onConnect: () => void;
}) {
  const Icon = meta.Icon;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: spacing.rowPaddingY,
        paddingHorizontal: spacing.rowPaddingX,
        borderTopWidth: isFirst ? 0 : 1,
        borderTopColor: colors.lineSoft,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: meta.color + "22",
          borderWidth: 1,
          borderColor: meta.color + "55",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={16} color={meta.color} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 13,
            color: colors.text,
            fontFamily: fonts.bodyMedium,
          }}
        >
          {meta.name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontSize: 10.5,
            color: colors.text3,
            marginTop: 1,
            fontFamily: fonts.bodyRegular,
          }}
        >
          {meta.subtitle}
        </Text>
      </View>
      <Pressable
        onPress={onConnect}
        disabled={busy}
        hitSlop={4}
        style={{
          paddingVertical: 6,
          paddingHorizontal: 12,
          borderRadius: radii.buttonSm,
          borderWidth: 1,
          borderColor: colors.blueSoft,
          backgroundColor: "transparent",
          opacity: busy ? 0.5 : 1,
          minHeight: 32,
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
        }}
      >
        {busy ? (
          <ActivityIndicator size="small" color={colors.blue2} />
        ) : (
          <Text style={{ color: colors.blue2, fontSize: 11, fontFamily: fonts.bodySemi }}>
            Connect
          </Text>
        )}
      </Pressable>
    </View>
  );
}
