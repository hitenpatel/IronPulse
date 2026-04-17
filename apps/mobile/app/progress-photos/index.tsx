import React, { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Camera, Trash2 } from "lucide-react-native";
import { trpc } from "@/lib/trpc";

const colors = {
  background: "#060B14",
  card: "#0F1629",
  accent: "#1A2340",
  muted: "#243052",
  border: "#1E2B47",
  foreground: "#F0F4F8",
  mutedFg: "#8899B4",
  dimFg: "#4E6180",
  primary: "#0077FF",
  error: "#EF4444",
};

type Photo = Awaited<ReturnType<typeof trpc.progressPhoto.list.query>>[number];

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ProgressPhotosScreen() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const result = await trpc.progressPhoto.list.query();
      setPhotos(result);
    } catch {
      // keep stale
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleDelete(id: string) {
    Alert.alert(
      "Delete Photo",
      "Are you sure you want to permanently delete this photo?",
      [
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
      ],
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={["bottom"]}>
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.foreground} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          {/* Upload hint */}
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.border,
              padding: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Camera size={20} color={colors.mutedFg} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "600" }}>
                Upload Progress Photos
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: 12, marginTop: 3, lineHeight: 18 }}>
                Take and upload photos from the web app at Profile → Progress Photos.
              </Text>
            </View>
          </View>

          {photos.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 48, gap: 12 }}>
              <Camera size={48} color={colors.dimFg} />
              <Text style={{ color: colors.foreground, fontSize: 18, fontWeight: "600" }}>
                No Photos Yet
              </Text>
              <Text style={{ color: colors.mutedFg, fontSize: 14, textAlign: "center", lineHeight: 20 }}>
                Track your physique progress by uploading{"\n"}photos regularly from the web app.
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ color: colors.mutedFg, fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.4 }}>
                {photos.length} photo{photos.length !== 1 ? "s" : ""}
              </Text>

              {photos.map((photo) => {
                const isExpanded = expandedId === photo.id;
                const hasError = imageErrors.has(photo.id);

                return (
                  <View
                    key={photo.id}
                    style={{
                      backgroundColor: colors.card,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: colors.border,
                      overflow: "hidden",
                    }}
                  >
                    {/* Photo */}
                    <Pressable onPress={() => setExpandedId(isExpanded ? null : photo.id)}>
                      {hasError ? (
                        <View
                          style={{
                            height: isExpanded ? 300 : 160,
                            backgroundColor: colors.accent,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Camera size={32} color={colors.dimFg} />
                          <Text style={{ color: colors.dimFg, fontSize: 12, marginTop: 8 }}>
                            Image unavailable
                          </Text>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: photo.imageUrl }}
                          style={{
                            width: "100%",
                            height: isExpanded ? 300 : 160,
                          }}
                          resizeMode={isExpanded ? "contain" : "cover"}
                          onError={() =>
                            setImageErrors((prev) => new Set([...prev, photo.id]))
                          }
                        />
                      )}
                    </Pressable>

                    {/* Info row */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
                          {formatDate(photo.date)}
                        </Text>
                        {photo.notes && (
                          <Text
                            style={{ color: colors.mutedFg, fontSize: 12, marginTop: 2 }}
                            numberOfLines={isExpanded ? undefined : 1}
                          >
                            {photo.notes}
                          </Text>
                        )}
                      </View>
                      <Pressable
                        onPress={() => handleDelete(photo.id)}
                        disabled={deletingId === photo.id}
                        hitSlop={8}
                        style={{ padding: 4 }}
                      >
                        {deletingId === photo.id ? (
                          <ActivityIndicator size="small" color={colors.mutedFg} />
                        ) : (
                          <Trash2 size={16} color={colors.dimFg} />
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
