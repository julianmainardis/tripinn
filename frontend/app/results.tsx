import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMoodStore } from '../src/store/moodStore';
import { useAuthStore } from '../src/store/authStore';
import { ExperienceCard } from '../src/components/ExperienceCard';
import { Button } from '../src/components/Button';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';

export default function ResultsScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { currentRecommendation, clearRecommendation, saveExperience, savedExperiences, loadSavedExperiences } = useMoodStore();

  if (!currentRecommendation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay recomendaciones</Text>
          <Button
            title="Volver al inicio"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const { ai_message, quick_routine, experiences, mood_profile } = currentRecommendation;

  const isSaved = (experienceId: string) => {
    return savedExperiences.some(exp => exp.id === experienceId);
  };

  const handleSave = async (experienceId: string) => {
    if (!token) return;
    await saveExperience(experienceId, token);
    await loadSavedExperiences(token);
  };

  const handleClose = () => {
    clearRecommendation();
    router.back();
  };

  const handleShare = () => {
    router.push('/share');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mood Profile Badge */}
        <View style={styles.moodBadge}>
          <Text style={styles.moodLabel}>{mood_profile.mood_label}</Text>
          <Text style={styles.travelerType}>{mood_profile.traveler_type}</Text>
        </View>

        {/* AI Message */}
        <View style={styles.aiMessageContainer}>
          <View style={styles.aiIcon}>
            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
          </View>
          <Text style={styles.aiMessage}>{ai_message}</Text>
        </View>

        {/* Quick Routine */}
        {quick_routine && (
          <View style={styles.routineCard}>
            <View style={styles.routineHeader}>
              <Ionicons name="time-outline" size={20} color={COLORS.accent} />
              <Text style={styles.routineTitle}>Rutina rápida</Text>
            </View>
            <Text style={styles.routineText}>{quick_routine}</Text>
          </View>
        )}

        {/* Recommended Experiences */}
        <View style={styles.experiencesSection}>
          <Text style={styles.sectionTitle}>Experiencias para ti</Text>
          <Text style={styles.sectionSubtitle}>
            Basadas en cómo te sientes ahora
          </Text>

          {experiences.map((experience) => (
            <ExperienceCard
              key={experience.id}
              experience={experience}
              onPress={() => router.push(`/experience/${experience.id}`)}
              onSave={() => handleSave(experience.id)}
              isSaved={isSaved(experience.id)}
            />
          ))}
        </View>

        <Button
          title="Explorar más experiencias"
          onPress={() => {
            clearRecommendation();
            router.replace('/(tabs)/explore');
          }}
          variant="outline"
          style={styles.exploreButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  shareButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingTop: 0
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  emptyText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg
  },
  moodBadge: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  moodLabel: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary
  },
  travelerType: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginTop: SPACING.xs
  },
  aiMessageContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  aiIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md
  },
  aiMessage: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    lineHeight: 24
  },
  routineCard: {
    backgroundColor: `${COLORS.accent}15`,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg
  },
  routineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  routineTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.accentDark,
    marginLeft: SPACING.sm
  },
  routineText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    lineHeight: 22
  },
  experiencesSection: {
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg
  },
  exploreButton: {
    marginBottom: SPACING.xl
  }
});
