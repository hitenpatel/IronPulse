import React from "react";
import { Pressable, Text } from "react-native";
import type { LucideIcon } from "lucide-react-native";

const colors = {
  foreground: "hsl(213, 31%, 91%)",
  accent: "hsl(216, 34%, 17%)",
};

interface TypeCardProps {
  label: string;
  icon: LucideIcon;
  onPress: () => void;
}

export function TypeCard({ label, icon: Icon, onPress }: TypeCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.accent,
        borderRadius: 16,
        minWidth: "45%",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 24,
        paddingHorizontal: 16,
        gap: 10,
      }}
    >
      <Icon size={28} color={colors.foreground} />
      <Text
        style={{
          color: colors.foreground,
          fontSize: 15,
          fontWeight: "600",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
