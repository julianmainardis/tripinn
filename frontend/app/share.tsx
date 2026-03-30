import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { useMoodStore } from '../src/store/moodStore';
import { useAuthStore } from '../src/store/authStore';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';

export default function ShareScreen() {
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);
  const { user } = useAuthStore();
  const { emotionalProfile, currentRecommendation } = useMoodStore();
  const [isSharing, setIsSharing] = useState(false);

  const profile = currentRecommendation?.mood_profile || emotionalProfile;

  const handleShare = async () => {
    if (!viewShotRef.current) return;

    setIsSharing(true);
    try {
      const uri = await viewShotRef.current.capture?.();
      if (uri) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Comparte tu perfil emocional'
          });
        } else {
          Alert.alert('Error', 'Compartir no está disponible en este dispositivo');
        }
      }
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'No se pudo compartir la imagen');
    } finally {
      setIsSharing(false);
    }
  };

  if (!profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="analytics-outline" size={64} color={COLORS.textLight} />
          <Text style={styles.emptyTitle}>No hay perfil para compartir</Text>
          <Text style={styles.emptyText}>
            Registra cómo te sientes para generar tu perfil emocional
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const getMoodPercentages = () => {
    if (currentRecommendation?.mood_profile?.percentages) {
      return currentRecommendation.mood_profile.percentages;
    }
    if (emotionalProfile?.mood_percentages) {
      return emotionalProfile.mood_percentages;
    }
    return {};
  };

  const getTravelerType = () => {
    if (currentRecommendation?.mood_profile?.traveler_type) {
      return currentRecommendation.mood_profile.traveler_type;
    }
    if (emotionalProfile?.traveler_type) {
      return emotionalProfile.traveler_type;
    }
    return 'Explorador';
  };

  const percentages = getMoodPercentages();
  const travelerType = getTravelerType();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Compartir perfil</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: 'png', quality: 1 }}
          style={styles.shareCard}
        >
          <View style={styles.cardContent}>
            {/* Logo */}
            <Text style={styles.cardLogo}>Numa</Text>
            
            {/* User Name */}
            <Text style={styles.cardGreeting}>
              El perfil emocional de
            </Text>
            <Text style={styles.cardName}>{user?.name || 'Viajero'}</Text>

            {/* Traveler Type */}
            <View style={styles.travelerBadge}>
              <Ionicons name="compass" size={20} color={COLORS.textWhite} />
              <Text style={styles.travelerText}>{travelerType}</Text>
            </View>

            {/* Mood Distribution */}
            <View style={styles.moodDistribution}>
              <Text style={styles.distributionTitle}>Tu estado hoy</Text>
              {Object.entries(percentages).slice(0, 4).map(([mood, percentage]) => (
                <View key={mood} style={styles.moodRow}>
                  <Text style={styles.moodLabel}>{mood}</Text>
                  <View style={styles.moodBarBg}>
                    <View
                      style={[
                        styles.moodBarFill,
                        { width: `${percentage}%` }
                      ]}
                    />
                  </View>
                  <Text style={styles.moodPercentage}>{percentage}%</Text>
                </View>
              ))}
            </View>

            {/* Call to action */}
            <Text style={styles.cardCta}>
              Descubre qué experiencias te recomienda Numa
            </Text>
          </View>
        </ViewShot>

        <TouchableOpacity
          style={[styles.shareButton, isSharing && styles.shareButtonDisabled]}
          onPress={handleShare}
          disabled={isSharing}
        >
          <Ionicons name="share-outline" size={24} color={COLORS.textWhite} />
          <Text style={styles.shareButtonText}>
            {isSharing ? 'Preparando...' : 'Compartir imagen'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.shareHint}>
          Comparte en tus redes y deja que otros descubran su tipo de viajero
        </Text>
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start'
  },
  headerTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary
  },
  placeholder: {
    width: 44
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
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
    textAlign: 'center',
    marginTop: SPACING.xs
  },
  shareCard: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden'
  },
  cardContent: {
    padding: SPACING.xl,
    alignItems: 'center'
  },
  cardLogo: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    letterSpacing: 2,
    marginBottom: SPACING.lg
  },
  cardGreeting: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textWhite,
    opacity: 0.8
  },
  cardName: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    marginBottom: SPACING.lg
  },
  travelerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.xl
  },
  travelerText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
    marginLeft: SPACING.sm
  },
  moodDistribution: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg
  },
  distributionTitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textWhite,
    opacity: 0.8,
    marginBottom: SPACING.sm,
    textAlign: 'center'
  },
  moodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs
  },
  moodLabel: {
    width: 80,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textWhite
  },
  moodBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    marginHorizontal: SPACING.sm
  },
  moodBarFill: {
    height: '100%',
    backgroundColor: COLORS.textWhite,
    borderRadius: 4
  },
  moodPercentage: {
    width: 40,
    fontSize: FONTS.sizes.xs,
    color: COLORS.textWhite,
    textAlign: 'right'
  },
  cardCta: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textWhite,
    opacity: 0.9,
    textAlign: 'center'
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xl
  },
  shareButtonDisabled: {
    opacity: 0.7
  },
  shareButtonText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite,
    marginLeft: SPACING.sm
  },
  shareHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.lg
  }
});
