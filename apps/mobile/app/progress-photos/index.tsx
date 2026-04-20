import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Camera, Trash2 } from "lucide-react-native";

import { trpc } from "@/lib/trpc";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { Chip, TopBar, UppercaseLabel } from "@/components/ui";

type Photo = Awaited<ReturnType<typeof trpc.progressPhoto.list.query>>[number];

function shortDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", { month: "short", day: "numeric" }).toUpperCase();
}

export default function ProgressPhotosScreen() {
  const navigation = useNavigation();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      setPhotos(await trpc.progressPhoto.list.query());
    } catch {
      /* keep stale */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleDelete = (id: string) => {
    Alert.alert("Delete photo", "Permanently delete this photo?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          try {
            await trpc.progressPhoto.delete.mutate({ id });
            await load();
          } catch {
            Alert.alert("Error", "Failed to delete photo.");
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  // Compare — oldest vs newest
  const sorted = useMemo(
    () => [...photos].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [photos],
  );
  const oldest = sorted[0];
  const newest = sorted[sorted.length - 1];
  const hasCompare = photos.length >= 2 && oldest && newest && oldest.id !== newest.id;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <View style={{ paddingHorizontal: spacing.gutter }}>
        <TopBar
          title="Progress photos"
          onBack={() => navigation.goBack()}
          right={
            <Pressable
              hitSlop={6}
              accessibilityLabel="New photo"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: colors.blue,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Camera size={14} color={colors.blueInk} />
            </Pressable>
          }
        />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.text3} size="large" />
        </View>
      ) : photos.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 48, gap: 12 }}>
          <Camera size={40} color={colors.text4} />
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontFamily: fonts.displaySemi,
              letterSpacing: -0.3,
            }}
          >
            No photos yet
          </Text>
          <Text
            style={{
              color: colors.text3,
              textAlign: "center",
              fontFamily: fonts.bodyRegular,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Upload progress photos from the web app to start tracking visual change over time.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingBottom: 32, gap: 14 }}>
          {/* Compare card */}
          {hasCompare ? (
            <View
              style={{
                backgroundColor: colors.bg1,
                borderRadius: radii.card,
                borderWidth: 1,
                borderColor: colors.lineSoft,
                padding: 14,
              }}
            >
              <UppercaseLabel style={{ marginBottom: 10 }}>Compare</UppercaseLabel>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <CompareSlot photo={oldest!} label={shortDate(oldest!.date)} imageErrors={imageErrors} setImageErrors={setImageErrors} />
                <CompareSlot photo={newest!} label={shortDate(newest!.date)} imageErrors={imageErrors} setImageErrors={setImageErrors} isNow />
              </View>
            </View>
          ) : null}

          {/* Timeline grid */}
          <View>
            <UppercaseLabel style={{ marginBottom: 6 }}>
              Timeline · {photos.length}
            </UppercaseLabel>
            <FlatList
              data={photos}
              numColumns={3}
              keyExtractor={(p) => p.id}
              scrollEnabled={false}
              columnWrapperStyle={{ gap: 6 }}
              contentContainerStyle={{ gap: 6 }}
              renderItem={({ item }) => {
                const isNewest = item.id === newest?.id;
                return (
                  <Pressable
                    onPress={() => handleDelete(item.id)}
                    style={{
                      flex: 1,
                      aspectRatio: 1,
                      borderRadius: 10,
                      overflow: "hidden",
                      borderWidth: isNewest ? 2 : 1,
                      borderColor: isNewest ? colors.blue : colors.lineSoft,
                      backgroundColor: colors.bg2,
                      ...(isNewest && {
                        shadowColor: colors.blue,
                        shadowOpacity: 0.35,
                        shadowRadius: 8,
                        elevation: 4,
                      }),
                    }}
                  >
                    {imageErrors.has(item.id) ? (
                      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                        <Camera size={18} color={colors.text4} />
                      </View>
                    ) : (
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                        onError={() => setImageErrors((prev) => new Set([...prev, item.id]))}
                      />
                    )}
                    <View
                      style={{
                        position: "absolute",
                        left: 4,
                        top: 4,
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        backgroundColor: "rgba(6,11,20,0.7)",
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          color: colors.text2,
                          fontFamily: fonts.monoSemi,
                          letterSpacing: 0.8,
                        }}
                      >
                        {shortDate(item.date)}
                      </Text>
                    </View>
                    {deletingId === item.id ? (
                      <View
                        style={{
                          position: "absolute",
                          top: 0,
                          bottom: 0,
                          left: 0,
                          right: 0,
                          backgroundColor: "rgba(0,0,0,0.5)",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ActivityIndicator color={colors.white} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              }}
            />
          </View>

          {/* Entries list with delete */}
          <View>
            <UppercaseLabel style={{ marginBottom: 6 }}>Entries</UppercaseLabel>
            {photos.map((p) => (
              <View
                key={p.id}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: colors.bg1,
                  borderWidth: 1,
                  borderColor: colors.lineSoft,
                  borderRadius: 10,
                  padding: 10,
                  marginBottom: 6,
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    style={{ fontSize: 13, color: colors.text, fontFamily: fonts.bodyMedium }}
                  >
                    {new Date(p.date).toLocaleDateString()}
                  </Text>
                  {p.notes ? (
                    <Text
                      numberOfLines={1}
                      style={{ fontSize: 11, color: colors.text3, marginTop: 1, fontFamily: fonts.bodyRegular }}
                    >
                      {p.notes}
                    </Text>
                  ) : null}
                </View>
                <Pressable onPress={() => handleDelete(p.id)} disabled={deletingId === p.id} hitSlop={6}>
                  {deletingId === p.id ? (
                    <ActivityIndicator size="small" color={colors.text3} />
                  ) : (
                    <Trash2 size={14} color={colors.text4} />
                  )}
                </Pressable>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function CompareSlot({
  photo,
  label,
  imageErrors,
  setImageErrors,
  isNow,
}: {
  photo: Photo;
  label: string;
  imageErrors: Set<string>;
  setImageErrors: React.Dispatch<React.SetStateAction<Set<string>>>;
  isNow?: boolean;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          aspectRatio: 0.75,
          borderRadius: 10,
          overflow: "hidden",
          borderWidth: isNow ? 2 : 1,
          borderColor: isNow ? colors.blue : colors.lineSoft,
          backgroundColor: colors.bg2,
          position: "relative",
        }}
      >
        {imageErrors.has(photo.id) ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Camera size={28} color={colors.text4} />
          </View>
        ) : (
          <Image
            source={{ uri: photo.imageUrl }}
            style={{ width: "100%", height: "100%" }}
            resizeMode="cover"
            onError={() => setImageErrors((prev) => new Set([...prev, photo.id]))}
          />
        )}
        {isNow ? (
          <View style={{ position: "absolute", top: 6, right: 6 }}>
            <Chip tone="blue">NOW</Chip>
          </View>
        ) : null}
      </View>
      <Text
        style={{
          color: colors.text3,
          fontSize: 10,
          fontFamily: fonts.monoSemi,
          letterSpacing: 0.8,
          marginTop: 6,
          textAlign: "center",
        }}
      >
        {label}
      </Text>
    </View>
  );
}
