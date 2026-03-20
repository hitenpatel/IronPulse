import { View, Text, Pressable, StyleSheet } from "react-native";
import { AlertTriangle, WifiOff } from "lucide-react-native";

interface ErrorStateProps {
  variant?: "error" | "offline";
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ variant = "error", title, description, onRetry }: ErrorStateProps) {
  const Icon = variant === "offline" ? WifiOff : AlertTriangle;
  const defaultTitle = variant === "offline" ? "No internet connection" : "Something went wrong";
  const defaultDesc = variant === "offline"
    ? "Your data is saved locally and will sync when you're back online."
    : "Please try again. If the problem persists, contact support.";

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Icon size={40} color="#EF4444" />
      </View>
      <Text style={styles.title}>{title || defaultTitle}</Text>
      <Text style={styles.description}>{description || defaultDesc}</Text>
      {onRetry && (
        <Pressable style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Try Again</Text>
        </Pressable>
      )}
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "ClashDisplay",
    fontWeight: "600",
    fontSize: 20,
    color: "#F0F4F8",
    marginBottom: 8,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#8899B4",
    textAlign: "center",
    maxWidth: 300,
    marginBottom: 32,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: "#1E2B47",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    height: 48,
    justifyContent: "center",
  },
  retryText: {
    color: "#F0F4F8",
    fontWeight: "600",
    fontSize: 16,
  },
});
