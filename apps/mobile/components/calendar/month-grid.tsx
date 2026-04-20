import React from "react";
import { Pressable, Text, View } from "react-native";

import { colors as theme } from "@/lib/theme";

const colors = {
  background: theme.bg,
  foreground: theme.text,
  mutedFg: theme.text3,
  dimFg: theme.text4,
  primary: theme.green,
  success: theme.blue, // lime
  border: theme.line,
};

interface MonthGridProps {
  year: number;
  month: number; // 0-indexed
  workoutDays: Set<string>;
  cardioDays: Set<string>;
  selectedDate: string | null;
  onSelectDate: (dateStr: string) => void;
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`;
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function MonthGrid({
  year,
  month,
  workoutDays,
  cardioDays,
  selectedDate,
  onSelectDate,
}: MonthGridProps) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getTodayStr();

  // Monday = 0, Sunday = 6
  let startOffset = firstDay.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const dayHeaders = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View>
      {/* Day-of-week headers */}
      <View style={{ flexDirection: "row" }}>
        {dayHeaders.map((h) => (
          <View key={h} style={{ flex: 1, alignItems: "center", paddingVertical: 8 }}>
            <Text style={{ color: colors.mutedFg, fontSize: 12, fontWeight: "600" }}>{h}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={{ flexDirection: "row" }}>
          {row.map((day, ci) => {
            if (day == null) {
              return <View key={`e-${ci}`} style={{ flex: 1, height: 48 }} />;
            }

            const dateStr = toDateStr(year, month, day);
            const isSelected = selectedDate === dateStr;
            const isToday = dateStr === todayStr;
            const hasWorkout = workoutDays.has(dateStr);
            const hasCardio = cardioDays.has(dateStr);

            return (
              <Pressable
                key={dateStr}
                onPress={() => onSelectDate(dateStr)}
                style={{
                  flex: 1,
                  height: 48,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 8,
                  // Selected: filled primary background
                  backgroundColor: isSelected ? colors.primary : "transparent",
                  // Today (not selected): ring in primary blue
                  borderWidth: isToday && !isSelected ? 1.5 : 0,
                  borderColor: isToday && !isSelected ? colors.primary : "transparent",
                }}
              >
                <Text
                  style={{
                    color: isSelected
                      ? "#FFFFFF"
                      : isToday
                      ? colors.primary
                      : colors.foreground,
                    fontSize: 14,
                    fontWeight: isSelected || isToday ? "700" : "400",
                  }}
                >
                  {day}
                </Text>
                {/* Activity dots */}
                <View style={{ flexDirection: "row", gap: 3, marginTop: 2 }}>
                  {hasWorkout && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : colors.primary,
                      }}
                    />
                  )}
                  {hasCardio && (
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : colors.success,
                      }}
                    />
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
