import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { usePowerSync } from "@powersync/react";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useTemplates, type TemplateRow } from "@ironpulse/sync";
import { ClipboardList, Play, Plus, Trash2 } from "lucide-react-native";

import { randomUUID } from "@/lib/uuid";
import { useAuth } from "@/lib/auth";
import { colors, fonts, radii, spacing } from "@/lib/theme";
import { Button, Row, RowList, SegmentedControl, TopBar, UppercaseLabel } from "@/components/ui";
import type { RootStackParamList } from "../../App";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Tab = "mine" | "community" | "ai";

export default function WorkoutTemplatesScreen() {
  const navigation = useNavigation<Nav>();
  const db = usePowerSync();
  const { user } = useAuth();
  const { data: templates } = useTemplates();

  const [tab, setTab] = useState<Tab>("mine");

  const handleStartWorkout = useCallback(
    async (template: TemplateRow) => {
      const workoutId = randomUUID();
      const now = new Date().toISOString();

      await db.execute(
        `INSERT INTO workouts (id, user_id, name, started_at, template_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
        [workoutId, user!.id, template.name, now, template.id, now],
      );

      const templateExercises = await db.execute(
        `SELECT id, exercise_id, "order", notes FROM template_exercises WHERE template_id = ? ORDER BY "order"`,
        [template.id],
      );

      for (const te of templateExercises.rows?._array ?? []) {
        const weId = randomUUID();
        await db.execute(
          `INSERT INTO workout_exercises (id, workout_id, exercise_id, "order", notes) VALUES (?, ?, ?, ?, ?)`,
          [weId, workoutId, te.exercise_id, te.order, te.notes],
        );

        const templateSets = await db.execute(
          `SELECT set_number, target_reps, target_weight_kg, type FROM template_sets WHERE template_exercise_id = ? ORDER BY set_number`,
          [te.id],
        );

        for (const ts of templateSets.rows?._array ?? []) {
          await db.execute(
            `INSERT INTO exercise_sets (id, workout_exercise_id, set_number, type, weight_kg, reps, completed) VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [randomUUID(), weId, ts.set_number, ts.type, ts.target_weight_kg, ts.target_reps],
          );
        }
      }

      navigation.navigate("WorkoutActive", { workoutId });
    },
    [db, user, navigation],
  );

  const handleDelete = useCallback(
    (template: TemplateRow) => {
      Alert.alert("Delete Template", `Delete "${template.name}"? This cannot be undone.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await db.execute(
              `DELETE FROM template_sets WHERE template_exercise_id IN (SELECT id FROM template_exercises WHERE template_id = ?)`,
              [template.id],
            );
            await db.execute("DELETE FROM template_exercises WHERE template_id = ?", [template.id]);
            await db.execute("DELETE FROM workout_templates WHERE id = ?", [template.id]);
          },
        },
      ]);
    },
    [db],
  );

  const mineCount = templates.length;
  const inRotation = templates.slice(0, 4);
  const archive = templates.slice(4);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["bottom"]}>
      <View style={{ paddingHorizontal: spacing.gutter }}>
        <TopBar
          title="Templates"
          onBack={() => navigation.goBack()}
          right={
            <Pressable
              hitSlop={6}
              accessibilityLabel="New template"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: colors.blue,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={16} color={colors.blueInk} />
            </Pressable>
          }
        />

        <SegmentedControl<Tab>
          items={[
            { key: "mine", label: `Mine · ${mineCount}` },
            { key: "community", label: "Community" },
            { key: "ai", label: "AI" },
          ]}
          activeKey={tab}
          onChange={setTab}
        />
      </View>

      {tab !== "mine" ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 40 }}>
          <Text
            style={{
              color: colors.text3,
              textAlign: "center",
              fontFamily: fonts.bodyRegular,
              fontSize: 13,
            }}
          >
            {tab === "community"
              ? "Community templates are coming soon."
              : "AI-generated templates are coming soon."}
          </Text>
        </View>
      ) : templates.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 48 }}>
          <ClipboardList size={44} color={colors.text4} />
          <Text
            style={{
              color: colors.text,
              fontSize: 16,
              fontFamily: fonts.displaySemi,
              letterSpacing: -0.3,
            }}
          >
            No templates
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
            Complete a workout and save it as a template, or build one on the web.
          </Text>
        </View>
      ) : (
        <FlatList
          data={inRotation}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: spacing.gutter, paddingTop: 14, paddingBottom: 32 }}
          ListHeaderComponent={
            <UppercaseLabel style={{ marginBottom: 8 }}>In rotation</UppercaseLabel>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => <RichCard template={item} onStart={() => handleStartWorkout(item)} onDelete={() => handleDelete(item)} />}
          ListFooterComponent={
            archive.length > 0 ? (
              <View style={{ marginTop: 20 }}>
                <UppercaseLabel style={{ marginBottom: 6 }}>
                  Archive · {archive.length}
                </UppercaseLabel>
                <RowList>
                  {archive.map((t) => (
                    <Row
                      key={t.id}
                      leading={<ClipboardList size={14} />}
                      leadingTone="mono"
                      title={t.name}
                      subtitle={`${t.exercise_count ?? 0} exercise${t.exercise_count === 1 ? "" : "s"}`}
                      chevron
                      onPress={() => handleStartWorkout(t)}
                    />
                  ))}
                </RowList>
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

interface RichCardProps {
  template: TemplateRow;
  onStart: () => void;
  onDelete: () => void;
}

function RichCard({ template, onStart, onDelete }: RichCardProps) {
  const initial = template.name.charAt(0).toUpperCase();
  return (
    <View
      style={{
        backgroundColor: colors.bg1,
        borderWidth: 1,
        borderColor: colors.lineSoft,
        borderRadius: radii.card,
        paddingVertical: 14,
        paddingHorizontal: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            backgroundColor: colors.blueSoft,
            borderWidth: 1,
            borderColor: colors.blue,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{
              fontFamily: fonts.displaySemi,
              color: colors.blue2,
              fontSize: 18,
            }}
          >
            {initial}
          </Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: fonts.displaySemi,
              fontSize: 15,
              color: colors.text,
              letterSpacing: -0.2,
            }}
          >
            {template.name}
          </Text>
          <Text
            style={{
              color: colors.text3,
              fontSize: 10.5,
              marginTop: 1,
              fontFamily: fonts.bodyRegular,
            }}
          >
            {template.exercise_count ?? 0} exercise
            {template.exercise_count === 1 ? "" : "s"}
          </Text>
        </View>
        <Pressable onPress={onDelete} hitSlop={8}>
          <Trash2 size={16} color={colors.text4} />
        </Pressable>
      </View>
      <View style={{ marginTop: 12 }}>
        <Button variant="primary" onPress={onStart}>
          <Play size={14} color={colors.blueInk} />
          <Text style={{ color: colors.blueInk, fontFamily: fonts.bodySemi, fontSize: 13 }}>Start workout</Text>
        </Button>
      </View>
    </View>
  );
}
