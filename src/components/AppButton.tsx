import React from "react";
import { Pressable, Text } from "react-native";

import { styles } from "../features/styles";

export type AppButtonVariant = "primary" | "secondary" | "danger";

export function AppButton({
  title,
  onPress,
  disabled,
  variant = "primary",
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: AppButtonVariant;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.buttonBase,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}>
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" && styles.buttonTextSecondary,
          variant === "danger" && styles.buttonTextDanger,
        ]}>
        {title}
      </Text>
    </Pressable>
  );
}
