import { View, Text, Pressable, StyleSheet } from "react-native";
import { type LucideIcon } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon size={32} color={colors.text3} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable style={styles.button} onPress={onAction} accessibilityRole="button">
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bg2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
    marginBottom: 4,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: colors.text3,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 24,
    fontFamily: fonts.bodyRegular,
    lineHeight: 18,
  },
  button: {
    backgroundColor: colors.blue,
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
    height: 44,
    justifyContent: "center",
  },
  buttonText: {
    // Dark ink on lime — never white.
    color: colors.blueInk,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
});
