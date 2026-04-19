import { View, Text, Pressable, StyleSheet } from "react-native";
import { AlertTriangle, WifiOff } from "lucide-react-native";
import { colors, fonts, radii } from "@/lib/theme";

interface ErrorStateProps {
  variant?: "error" | "offline";
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ variant = "error", title, description, onRetry }: ErrorStateProps) {
  const Icon = variant === "offline" ? WifiOff : AlertTriangle;
  const defaultTitle = variant === "offline" ? "No internet connection" : "Something went wrong";
  const defaultDesc =
    variant === "offline"
      ? "Your data is saved locally and will sync when you're back online."
      : "Please try again. If the problem persists, contact support.";

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon size={36} color={colors.red} />
      </View>
      <Text style={styles.title}>{title || defaultTitle}</Text>
      <Text style={styles.description}>{description || defaultDesc}</Text>
      {onRetry ? (
        <Pressable style={styles.retryButton} onPress={onRetry} accessibilityRole="button">
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,61,90,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 18,
    color: colors.text,
    marginBottom: 6,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 13,
    color: colors.text3,
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 24,
    lineHeight: 18,
    fontFamily: fonts.bodyRegular,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg2,
    borderRadius: radii.button,
    paddingVertical: 12,
    paddingHorizontal: 24,
    height: 44,
    justifyContent: "center",
  },
  retryText: {
    color: colors.text,
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
});
