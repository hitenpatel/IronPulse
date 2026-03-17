import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
}

export function Input({ label, ...props }: InputProps) {
  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text
          style={{
            fontSize: 14,
            fontWeight: "500",
            color: "hsl(213, 31%, 91%)",
          }}
        >
          {label}
        </Text>
      ) : null}
      <TextInput
        style={{
          borderRadius: 8,
          borderWidth: 1,
          borderColor: "hsl(216, 34%, 17%)",
          backgroundColor: "hsl(224, 71%, 4%)",
          paddingHorizontal: 12,
          paddingVertical: 10,
          color: "hsl(213, 31%, 91%)",
          fontSize: 16,
        }}
        placeholderTextColor="hsl(215, 20%, 65%)"
        {...props}
      />
    </View>
  );
}
