import { useState } from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
}

// Pulse design system — hex values sourced from tailwind.config.ts tokens
export function Input({ label, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: "#F0F4F8",
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        style={{
          borderRadius: 8,
          borderWidth: 1,
          borderColor: focused ? "#0077FF" : "#1E2B47",
          backgroundColor: "#0F1629",
          paddingHorizontal: 12,
          height: 48,
          color: "#F0F4F8",
          fontSize: 16,
        }}
        placeholderTextColor="#4E6180"
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}
