import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle
}) => {
  const buttonStyles = [
    styles.base,
    styles[variant],
    styles[`${size}Size`],
    disabled && styles.disabled,
    style
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`],
    disabled && styles.disabledText,
    textStyle
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'outline' ? COLORS.primary : COLORS.textWhite} />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md
  },
  primary: {
    backgroundColor: COLORS.primary
  },
  secondary: {
    backgroundColor: COLORS.accent
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  smallSize: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md
  },
  mediumSize: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg
  },
  largeSize: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl
  },
  disabled: {
    opacity: 0.5
  },
  text: {
    fontWeight: FONTS.weights.semibold
  },
  primaryText: {
    color: COLORS.textWhite
  },
  secondaryText: {
    color: COLORS.textWhite
  },
  outlineText: {
    color: COLORS.primary
  },
  smallText: {
    fontSize: FONTS.sizes.sm
  },
  mediumText: {
    fontSize: FONTS.sizes.md
  },
  largeText: {
    fontSize: FONTS.sizes.lg
  },
  disabledText: {
    opacity: 0.7
  }
});
