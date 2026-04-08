import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface MoodCardProps {
  id: string;
  label: string;
  emoji: string;
  icon?: string;
  color: string;
  description: string;
  onPress: (id: string) => void;
  selected?: boolean;
}

export const MoodCard: React.FC<MoodCardProps> = ({
  id,
  label,
  emoji,
  icon,
  color,
  description,
  onPress,
  selected = false
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.container,
        { borderColor: selected ? color : COLORS.border },
        selected && { backgroundColor: `${color}15` }
      ]}
      onPress={() => onPress(id)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${color}18` }]}>
        {icon ? (
          <Ionicons name={icon as any} size={26} color={color} />
        ) : (
          <Text style={styles.emoji}>{emoji}</Text>
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, selected && { color }]}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={selected ? color : COLORS.textLight} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1.5,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md
  },
  emoji: {
    fontSize: 26
  },
  textContainer: {
    flex: 1
  },
  label: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary
  }
});
