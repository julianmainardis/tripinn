import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

interface MoodCardProps {
  id: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
  onPress: (id: string) => void;
  selected?: boolean;
}

export const MoodCard: React.FC<MoodCardProps> = ({
  id,
  label,
  emoji,
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
      <View style={[styles.emojiContainer, { backgroundColor: `${color}20` }]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.label, selected && { color }]}>{label}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
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
    borderWidth: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  emojiContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md
  },
  emoji: {
    fontSize: 28
  },
  textContainer: {
    flex: 1
  },
  label: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary
  }
});
