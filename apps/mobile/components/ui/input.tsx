import { useState } from "react";
import { View, Text, TextInput, type TextInputProps } from "react-native";
import { colors, radii, fonts, tracking } from "@/lib/theme";

interface InputProps extends TextInputProps {
  /** Uppercase label above the field — per handoff: 10px, +0.14em, text-3, weight 600 */
  label?: string;
  /** Right-side slot inside the input (e.g. eye toggle) */
  right?: React.ReactNode;
}

export function Input({ label, right, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ gap: 6 }}>
      {label ? (
        <Text
          style={{
            fontSize: 10,
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: tracking.caps,
            color: colors.text3,
            fontFamily: fonts.body,
          }}
        >
          {label}
        </Text>
      ) : null}
      <View style={{ position: "relative", justifyContent: "center" }}>
        <TextInput
          style={{
            borderRadius: radii.button,
            borderWidth: 1,
            borderColor: focused ? colors.blue : colors.line,
            backgroundColor: colors.bg2,
            paddingHorizontal: 12,
            paddingRight: right ? 38 : 12,
            paddingVertical: 10,
            color: colors.text,
            fontSize: 13,
            fontFamily: fonts.body,
          }}
          placeholderTextColor={colors.text4}
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
        {right ? <View style={{ position: "absolute", right: 10 }}>{right}</View> : null}
      </View>
    </View>
  );
}
