/**
 * Drop-in replacement for expo-apple-authentication.
 *
 * Stubs that match the API surface used in login.tsx and signup.tsx.
 * Replace with @invertase/react-native-apple-authentication later.
 */

import React from "react";
import { View, Text, Pressable, type ViewStyle } from "react-native";

export enum AppleAuthenticationScope {
  FULL_NAME = 0,
  EMAIL = 1,
}

export enum AppleAuthenticationButtonType {
  SIGN_IN = 0,
  CONTINUE = 1,
  SIGN_UP = 2,
}

export enum AppleAuthenticationButtonStyle {
  WHITE = 0,
  WHITE_OUTLINE = 1,
  BLACK = 2,
}

export interface AppleAuthenticationCredential {
  user: string;
  identityToken: string | null;
  authorizationCode: string | null;
  email: string | null;
  fullName: {
    givenName: string | null;
    familyName: string | null;
    middleName: string | null;
    namePrefix: string | null;
    nameSuffix: string | null;
    nickname: string | null;
  } | null;
  realUserStatus: number;
  state: string | null;
}

export interface SignInOptions {
  requestedScopes?: AppleAuthenticationScope[];
  state?: string;
  nonce?: string;
}

export async function signInAsync(
  _options?: SignInOptions,
): Promise<AppleAuthenticationCredential> {
  // Stub: throw a cancel error like the real SDK would when unavailable
  const error: any = new Error("Apple Authentication is not available");
  error.code = "ERR_REQUEST_CANCELED";
  throw error;
}

/**
 * Stub replacement for the native AppleAuthenticationButton.
 * Renders a styled Pressable that looks like the Apple button.
 */
export function AppleAuthenticationButton({
  buttonType: _buttonType,
  buttonStyle: _buttonStyle,
  cornerRadius,
  style,
  onPress,
}: {
  buttonType?: AppleAuthenticationButtonType;
  buttonStyle?: AppleAuthenticationButtonStyle;
  cornerRadius?: number;
  style?: ViewStyle;
  onPress?: () => void;
}) {
  return React.createElement(
    Pressable,
    {
      onPress,
      style: {
        ...(style as object),
        backgroundColor: "#000",
        borderRadius: cornerRadius ?? 8,
        alignItems: "center" as const,
        justifyContent: "center" as const,
      },
    },
    React.createElement(Text, {
      style: { color: "#fff", fontWeight: "600" as const, fontSize: 14 },
      children: "Sign in with Apple",
    }),
  );
}
