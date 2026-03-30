import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMoodStore } from '../../src/store/moodStore';
import { useAuthStore } from '../../src/store/authStore';
import { ExperienceCard } from '../../src/components/ExperienceCard';
import { COLORS, FONTS, SPACING } from '../../src/constants/theme';

export default function SavedScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { savedExperiences, loadSavedExperiences, unsaveExperience } = useMoodStore();

  useEffect(() => {
    if (token) {
      loadSavedExperiences(token);
    }
  }, [token]);

  const handleUnsave = async (experienceId: string) => {
    if (!token) return;
    await unsaveExperience(experienceId, token);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Guardados</Text>
        <Text style={styles.subtitle}>Tus experiencias favoritas</Text>
      </View>

      <FlatList
        data={savedExperiences}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ExperienceCard
            experience={item}
            onPress={() => router.push(`/experience/${item.id}`)}
            onSave={() => handleUnsave(item.id)}
            isSaved={true}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aún no tienes guardados</Text>
            <Text style={styles.emptyText}>
              Explora experiencias y guarda las que más te gusten
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  header: {
    padding: SPACING.lg
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs
  },
  listContent: {
    padding: SPACING.lg,
    paddingTop: 0
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xxl * 2
  },
  emptyTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md
  },
  emptyText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl
  }
});
