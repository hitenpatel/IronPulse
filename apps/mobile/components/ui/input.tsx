import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      {label ? <Text className="text-sm font-medium text-foreground">{label}</Text> : null}
      <TextInput
        className="rounded-lg border border-border bg-background px-3 py-2.5 text-foreground"
        placeholderTextColor="hsl(215 20% 65%)"
        {...props}
      />
    </View>
  );
}
