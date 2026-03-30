import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useMoodStore } from '../../src/store/moodStore';
import { Button } from '../../src/components/Button';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { token } = useAuthStore();
  const { emotionalProfile, loadEmotionalProfile, moodHistory, loadMoodHistory } = useMoodStore();

  useEffect(() => {
    if (token) {
      loadEmotionalProfile(token);
      loadMoodHistory(token);
    }
  }, [token]);

  const handleLogout = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          }
        }
      ]
    );
  };

  const handleShare = () => {
    router.push('/share');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.locationContainer}>
            <Ionicons name="location" size={16} color={COLORS.textSecondary} />
            <Text style={styles.location}>{user?.nationality}</Text>
          </View>
        </View>

        {emotionalProfile && emotionalProfile.total_entries > 0 && (
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Text style={styles.profileTitle}>Tu Perfil Emocional</Text>
              <TouchableOpacity onPress={handleShare}>
                <Ionicons name="share-outline" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.travelerTypeContainer}>
              <Text style={styles.travelerTypeLabel}>Tipo de viajero</Text>
              <Text style={styles.travelerType}>{emotionalProfile.traveler_type}</Text>
            </View>

            {emotionalProfile.dominant_mood && (
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Estado dominante</Text>
                <Text style={styles.statValue}>{emotionalProfile.dominant_mood}</Text>
              </View>
            )}

            <View style={styles.moodBars}>
              {Object.entries(emotionalProfile.mood_percentages).map(([mood, percentage]) => (
                <View key={mood} style={styles.moodBarContainer}>
                  <View style={styles.moodBarHeader}>
                    <Text style={styles.moodBarLabel}>{mood}</Text>
                    <Text style={styles.moodBarPercentage}>{percentage}%</Text>
                  </View>
                  <View style={styles.moodBarBackground}>
                    <View
                      style={[
                        styles.moodBarFill,
                        { width: `${percentage}%` }
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            <Text style={styles.entriesCount}>
              {emotionalProfile.total_entries} registros emocionales
            </Text>
          </View>
        )}

        {(!emotionalProfile || emotionalProfile.total_entries === 0) && (
          <View style={styles.emptyProfile}>
            <Ionicons name="analytics-outline" size={48} color={COLORS.textLight} />
            <Text style={styles.emptyTitle}>Aún no hay datos</Text>
            <Text style={styles.emptyText}>
              Registra cómo te sientes para ver tu perfil emocional
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial reciente</Text>
          {moodHistory.slice(0, 5).map((entry, index) => (
            <View key={entry.id || index} style={styles.historyItem}>
              <View style={styles.historyDot} />
              <View style={styles.historyContent}>
                <Text style={styles.historyMood}>{entry.mood_label}</Text>
                <Text style={styles.historyDate}>
                  {new Date(entry.timestamp).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </View>
          ))}
          {moodHistory.length === 0 && (
            <Text style={styles.noHistory}>No hay historial aún</Text>
          )}
        </View>

        <Button
          title="Cerrar sesión"
          onPress={handleLogout}
          variant="outline"
          style={styles.logoutButton}
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
  scrollContent: {
    padding: SPACING.lg
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  avatarText: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite
  },
  name: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary
  },
  email: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xs
  },
  location: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs
  },
  profileCard: {
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
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  profileTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary
  },
  travelerTypeContainer: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    alignItems: 'center'
  },
  travelerTypeLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary
  },
  travelerType: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginTop: SPACING.xs
  },
  statItem: {
    marginBottom: SPACING.md
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary
  },
  statValue: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary
  },
  moodBars: {
    gap: SPACING.sm
  },
  moodBarContainer: {
    marginBottom: SPACING.xs
  },
  moodBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  moodBarLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary
  },
  moodBarPercentage: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
    fontWeight: FONTS.weights.medium
  },
  moodBarBackground: {
    height: 8,
    backgroundColor: COLORS.backgroundDark,
    borderRadius: 4
  },
  moodBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4
  },
  entriesCount: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md
  },
  emptyProfile: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center'
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
  section: {
    marginBottom: SPACING.lg
  },
  sectionTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: SPACING.sm
  },
  historyContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  historyMood: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary
  },
  historyDate: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary
  },
  noHistory: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    fontStyle: 'italic'
  },
  logoutButton: {
    marginTop: SPACING.md,
    borderColor: COLORS.error
  }
});
