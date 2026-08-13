import React from "react";
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Lock, Trophy } from "lucide-react-native";
import { ACHIEVEMENT_CATALOG, type AchievementBadge } from "@zor/shared";
import { trpc } from "@/lib/trpc";
import { formatBadgeDate } from "@/lib/achievement-utils";

import { colors as theme, fonts, radii } from "@/lib/theme";

const colors = {
  background: theme.bg,
  card: theme.bg1,
  accent: theme.bg3,
  muted: theme.bg2,
  border: theme.line,
  borderSubtle: theme.lineSoft,
  foreground: theme.text,
  mutedFg: theme.text3,
  dimFg: theme.text4,
  primary: theme.blue,
  primarySoft: theme.blueSoft,
  primaryInk: theme.blueInk,
};

interface BadgeCardProps {
  badge: AchievementBadge;
  unlockedAt: Date | null;
}

function BadgeCard({ badge, unlockedAt }: BadgeCardProps) {
  const unlocked = unlockedAt !== null;
  return (
    <View
      testID={`badge-${badge.type}`}
      style={{
        flex: 1,
        margin: 6,
        padding: 16,
        borderRadius: radii.card,
        borderWidth: 1,
        borderColor: unlocked ? colors.primary : colors.borderSubtle,
        backgroundColor: unlocked ? colors.primarySoft : colors.card,
        opacity: unlocked ? 1 : 0.6,
        alignItems: "center",
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: unlocked ? colors.primarySoft : colors.muted,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 10,
        }}
      >
        {unlocked ? (
          <Text style={{ fontSize: 28 }}>{badge.emoji}</Text>
        ) : (
          <Lock size={22} color={colors.dimFg} />
        )}
      </View>
      <Text
        style={{
          color: unlocked ? colors.foreground : colors.mutedFg,
          fontSize: 13,
          fontFamily: fonts.bodySemi,
          textAlign: "center",
        }}
      >
        {badge.label}
      </Text>
      <Text
        numberOfLines={2}
        style={{
          color: colors.dimFg,
          fontSize: 11,
          fontFamily: fonts.bodyRegular,
          textAlign: "center",
          marginTop: 4,
        }}
      >
        {badge.description}
      </Text>
      {unlocked && unlockedAt && (
        <Text
          style={{
            color: colors.primary,
            fontSize: 10,
            fontFamily: fonts.bodySemi,
            marginTop: 8,
            letterSpacing: 0.3,
          }}
        >
          {formatBadgeDate(unlockedAt)}
        </Text>
      )}
    </View>
  );
}

type AchievementData = {
  achievements: { id: string; type: string; unlockedAt: Date }[];
};

// trpc is a vanilla createTRPCClient (not createTRPCReact), so .useQuery /
// .useMutation hooks are unavailable. Mirror the query/mutation state manually.
export default function AchievementsScreen() {
  const [data, setData] = React.useState<AchievementData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isError, setIsError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const checkedRef = React.useRef(false);

  const fetchAchievements = React.useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    setError(null);
    try {
      const result = await trpc.achievement.list.query();
      setData(result as unknown as AchievementData);
    } catch (err) {
      setIsError(true);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  // Trigger retroactive unlock once on mount
  React.useEffect(() => {
    if (checkedRef.current) return;
    checkedRef.current = true;
    trpc.achievement.checkMine.mutate(undefined).then(fetchAchievements).catch(() => {});
  }, [fetchAchievements]);

  const query = {
    data,
    isLoading,
    isError,
    error,
    refetch: fetchAchievements,
  };

  const unlockedMap = React.useMemo(() => {
    const map = new Map<string, Date>();
    for (const a of query.data?.achievements ?? []) {
      map.set(a.type, new Date(a.unlockedAt));
    }
    return map;
  }, [query.data]);

  const unlockedCount = unlockedMap.size;
  const totalCount = ACHIEVEMENT_CATALOG.length;

  const renderItem: ListRenderItem<AchievementBadge> = ({ item }) => (
    <BadgeCard badge={item} unlockedAt={unlockedMap.get(item.type) ?? null} />
  );

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Trophy size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: colors.foreground,
                fontSize: 20,
                fontFamily: fonts.displaySemi,
                letterSpacing: -0.3,
              }}
            >
              Achievements
            </Text>
            <Text
              testID="achievements-progress"
              style={{
                color: colors.mutedFg,
                fontSize: 12,
                fontFamily: fonts.bodyRegular,
                marginTop: 2,
              }}
            >
              {query.isLoading
                ? "Loading…"
                : `${unlockedCount} of ${totalCount} unlocked`}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: colors.muted,
            marginTop: 14,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              width: query.isLoading
                ? 0
                : `${(unlockedCount / totalCount) * 100}%` as unknown as number,
              height: "100%",
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>

      {query.isLoading ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : query.isError ? (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: 32,
          }}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 14,
              fontFamily: fonts.bodySemi,
              textAlign: "center",
            }}
          >
            Couldn't load achievements
          </Text>
          <Text
            style={{
              color: colors.mutedFg,
              fontSize: 12,
              fontFamily: fonts.bodyRegular,
              textAlign: "center",
              marginTop: 6,
            }}
          >
            {query.error?.message ?? "Network or server error"}
          </Text>
          <Pressable
            onPress={() => query.refetch()}
            testID="achievements-retry"
            style={{
              marginTop: 16,
              backgroundColor: colors.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 10,
            }}
          >
            <Text
              style={{
                color: colors.primaryInk,
                fontSize: 13,
                fontFamily: fonts.bodySemi,
              }}
            >
              Try again
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={ACHIEVEMENT_CATALOG}
          keyExtractor={(b) => b.type}
          numColumns={2}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10, paddingBottom: 40 }}
          columnWrapperStyle={{ gap: 0 }}
        />
      )}
    </SafeAreaView>
  );
}
