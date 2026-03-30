import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/authStore';
import { useMoodStore } from '../../src/store/moodStore';
import { MoodCard } from '../../src/components/MoodCard';
import { MOOD_OPTIONS } from '../../src/constants/nationalities';
import { COLORS, FONTS, SPACING } from '../../src/constants/theme';

export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { analyzeMood, isLoading } = useMoodStore();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const handleMoodSelect = async (moodId: string) => {
    if (!token) return;
    
    setSelectedMood(moodId);
    
    try {
      await analyzeMood(moodId, 0.7, token);
      router.push('/results');
    } catch (error) {
      console.error('Error analyzing mood:', error);
    } finally {
      setSelectedMood(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Hola, {user?.name?.split(' ')[0] || 'Viajero'}</Text>
          <Text style={styles.title}>¿Cómo te sientes hoy?</Text>
          <Text style={styles.subtitle}>
            Elige lo que mejor describe tu estado actual
          </Text>
        </View>

        <View style={styles.moodList}>
          {MOOD_OPTIONS.map((mood) => (
            <MoodCard
              key={mood.id}
              id={mood.id}
              label={mood.label}
              emoji={mood.emoji}
              color={mood.color}
              description={mood.description}
              onPress={handleMoodSelect}
              selected={selectedMood === mood.id}
            />
          ))}
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Analizando tu estado...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContent: {
    padding: SPACING.lg
  },
  header: {
    marginBottom: SPACING.xl
  },
  greeting: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary
  },
  moodList: {
    gap: SPACING.sm
  },
  loadingContainer: {
    marginTop: SPACING.xl,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary
  }
});
