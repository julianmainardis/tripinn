import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMoodStore, Experience } from '../../src/store/moodStore';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/Button';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { allExperiences, savedExperiences, saveExperience, unsaveExperience, loadAllExperiences, loadSavedExperiences } = useMoodStore();
  const [experience, setExperience] = useState<Experience | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadAllExperiences();
    if (token) {
      loadSavedExperiences(token);
    }
  }, []);

  useEffect(() => {
    const found = allExperiences.find(exp => exp.id === id);
    if (found) {
      setExperience(found);
    }
  }, [id, allExperiences]);

  useEffect(() => {
    if (experience) {
      setIsSaved(savedExperiences.some(exp => exp.id === experience.id));
    }
  }, [savedExperiences, experience]);

  const handleSaveToggle = async () => {
    if (!token || !experience) return;
    
    if (isSaved) {
      await unsaveExperience(experience.id, token);
    } else {
      await saveExperience(experience.id, token);
    }
    setIsSaved(!isSaved);
  };

  const handleBooking = () => {
    if (experience?.affiliate_link_placeholder) {
      Linking.openURL(experience.affiliate_link_placeholder);
    }
  };

  if (!experience) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'nature': return 'leaf';
      case 'beach': return 'sunny';
      case 'mountain': return 'triangle';
      case 'urban': return 'business';
      case 'retreat': return 'flower';
      default: return 'compass';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'nature': return 'Naturaleza';
      case 'beach': return 'Playa';
      case 'mountain': return 'Montaña';
      case 'urban': return 'Urbano';
      case 'retreat': return 'Retiro';
      default: return category;
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: experience.image_url }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay} />
          
          {/* Header buttons */}
          <SafeAreaView style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleSaveToggle}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={24}
                color={isSaved ? COLORS.error : COLORS.textWhite}
              />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Title overlay */}
          <View style={styles.titleOverlay}>
            <View style={styles.categoryBadge}>
              <Ionicons
                name={getCategoryIcon(experience.category) as any}
                size={14}
                color={COLORS.textPrimary}
              />
              <Text style={styles.categoryText}>
                {getCategoryName(experience.category)}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{experience.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.textWhite} />
              <Text style={styles.locationText}>{experience.location}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Quick Info */}
          <View style={styles.quickInfo}>
            <View style={styles.infoItem}>
              <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>{experience.duration}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Ionicons name="pricetag-outline" size={20} color={COLORS.primary} />
              <Text style={styles.infoText}>{experience.tags.slice(0, 2).join(', ')}</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sobre esta experiencia</Text>
            <Text style={styles.description}>{experience.description}</Text>
          </View>

          {/* Tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Características</Text>
            <View style={styles.tagsContainer}>
              {experience.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Mood tags */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ideal para cuando te sientes</Text>
            <View style={styles.moodTagsContainer}>
              {experience.mood_tags.map((mood, index) => {
                const moodLabels: Record<string, string> = {
                  stressed: 'Saturado',
                  sad: 'Bajo de ánimo',
                  need_change: 'Necesitas cambio',
                  disconnect: 'Quieres desconectar',
                  lost: 'Perdido'
                };
                return (
                  <View key={index} style={styles.moodTag}>
                    <Text style={styles.moodTagText}>{moodLabels[mood] || mood}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Note about demo */}
          <View style={styles.demoNote}>
            <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
            <Text style={styles.demoNoteText}>
              Esta es una experiencia de demo. La integración con plataformas de reserva estará disponible próximamente.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomCta}>
        <Button
          title="Ver opciones de reserva"
          onPress={handleBooking}
          size="large"
          style={styles.bookButton}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary
  },
  imageContainer: {
    height: height * 0.45,
    position: 'relative'
  },
  heroImage: {
    width: '100%',
    height: '100%'
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)'
  },
  headerButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  titleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.textWhite,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm
  },
  categoryText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
    marginLeft: 4
  },
  heroTitle: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.xs
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  locationText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textWhite,
    marginLeft: 4
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: 100
  },
  quickInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  infoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
    marginLeft: SPACING.xs
  },
  infoDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.border
  },
  section: {
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm
  },
  description: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    lineHeight: 24
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm
  },
  tag: {
    backgroundColor: `${COLORS.primary}15`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full
  },
  tagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium
  },
  moodTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm
  },
  moodTag: {
    backgroundColor: `${COLORS.accent}20`,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full
  },
  moodTagText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.accentDark,
    fontWeight: FONTS.weights.medium
  },
  demoNote: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.md
  },
  demoNoteText: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    lineHeight: 20
  },
  bottomCta: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border
  },
  bookButton: {
    width: '100%'
  }
});
