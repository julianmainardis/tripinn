import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { Experience } from '../store/moodStore';

const { width } = Dimensions.get('window');

interface ExperienceCardProps {
  experience: Experience;
  onPress: () => void;
  onSave?: () => void;
  isSaved?: boolean;
  compact?: boolean;
}

export const ExperienceCard: React.FC<ExperienceCardProps> = ({
  experience,
  onPress,
  onSave,
  isSaved = false,
  compact = false
}) => {
  const cardWidth = compact ? (width - SPACING.lg * 3) / 2 : width - SPACING.lg * 2;
  
  return (
    <TouchableOpacity
      style={[styles.container, { width: cardWidth }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image
        source={{ uri: experience.image_url }}
        style={[styles.image, compact && styles.imageCompact]}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.tagContainer}>
            <Text style={styles.tag}>{experience.duration}</Text>
          </View>
          {onSave && (
            <TouchableOpacity onPress={onSave} style={styles.saveButton}>
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={24}
                color={isSaved ? COLORS.error : COLORS.textWhite}
              />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.info}>
          <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={2}>
            {experience.title}
          </Text>
          {!compact && (
            <Text style={styles.description} numberOfLines={2}>
              {experience.short_description}
            </Text>
          )}
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color={COLORS.textWhite} />
            <Text style={styles.location}>{experience.location}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    backgroundColor: COLORS.cardBackground,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  image: {
    width: '100%',
    height: 200
  },
  imageCompact: {
    height: 140
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  content: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: SPACING.md,
    justifyContent: 'space-between'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  tagContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm
  },
  tag: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary
  },
  saveButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center'
  },
  info: {
    gap: 4
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite
  },
  titleCompact: {
    fontSize: FONTS.sizes.md
  },
  description: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textWhite,
    opacity: 0.9
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  location: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textWhite,
    marginLeft: 4,
    opacity: 0.9
  }
});
