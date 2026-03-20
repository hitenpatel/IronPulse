import { View, Text, Pressable, StyleSheet } from "react-native";
import { type LucideIcon } from "lucide-react-native";

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
        <Icon size={32} color="#4E6180" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction && (
        <Pressable style={styles.button} onPress={onAction}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      )}
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
    backgroundColor: "#243052",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontFamily: "ClashDisplay",
    fontWeight: "500",
    fontSize: 18,
    color: "#F0F4F8",
    marginBottom: 4,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#8899B4",
    textAlign: "center",
    maxWidth: 280,
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#0077FF",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    height: 48,
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 16,
  },
});
