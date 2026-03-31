import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../../src/store/authStore';
import { useMoodStore } from '../../src/store/moodStore';
import { MoodCard } from '../../src/components/MoodCard';
import { MOOD_OPTIONS, DAILY_QUOTES } from '../../src/constants/nationalities';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export default function HomeScreen() {
  const router = useRouter();
  const { user, token } = useAuthStore();
  const { analyzeMood, isLoading } = useMoodStore();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [dailyQuote, setDailyQuote] = useState<{quote: string, author: string} | null>(null);

  useEffect(() => {
    // Get daily quote - use local if API fails
    const fetchQuote = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/quote/daily`);
        setDailyQuote(response.data);
      } catch (error) {
        // Fallback to local quotes
        const dayOfYear = new Date().getDate() % DAILY_QUOTES.length;
        setDailyQuote(DAILY_QUOTES[dayOfYear]);
      }
    };
    fetchQuote();
  }, []);

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 20) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'Viajero'}</Text>
          <Text style={styles.title}>¿Qué necesitas hoy?</Text>
        </View>

        {/* Daily Quote */}
        {dailyQuote && (
          <View style={styles.quoteCard}>
            <Ionicons name="sparkles" size={20} color={COLORS.accent} style={styles.quoteIcon} />
            <Text style={styles.quoteText}>"{dailyQuote.quote}"</Text>
            <Text style={styles.quoteAuthor}>— {dailyQuote.author}</Text>
          </View>
        )}

        <Text style={styles.subtitle}>Elige lo que mejor te describe ahora</Text>

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
            <Text style={styles.loadingText}>Preparando tus recomendaciones...</Text>
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
    marginBottom: SPACING.md
  },
  greeting: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary
  },
  quoteCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  quoteIcon: {
    marginBottom: SPACING.sm
  },
  quoteText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
    lineHeight: 24,
    marginBottom: SPACING.sm
  },
  quoteAuthor: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'right'
  },
  subtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md
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
