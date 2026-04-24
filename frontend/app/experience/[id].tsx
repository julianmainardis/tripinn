import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking, Dimensions, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useMoodStore, Experience } from '../../src/store/moodStore';
import { useAuthStore } from '../../src/store/authStore';
import { Button } from '../../src/components/Button';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';
import { tripsApi } from '../../src/features/trips/api/tripsApi';

const { width, height } = Dimensions.get('window');

interface MovieRecommendation {
  title: string;
  year: number;
  genre: string;
  description: string;
}

interface BookRecommendation {
  title: string;
  author: string;
  genre: string;
}

interface CoffeeRecommendation {
  name: string;
  tip: string;
}

interface FoodOption {
  name: string;
  description: string;
}

interface ExperienceWithRecommendations extends Experience {
  movie_recommendation?: MovieRecommendation;
  book_recommendation?: BookRecommendation;
  coffee_recommendation?: CoffeeRecommendation;
  food_recommendations?: FoodOption[];
}

export default function ExperienceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { token } = useAuthStore();
  const { savedExperiences, saveExperience, unsaveExperience, loadSavedExperiences } = useMoodStore();
  const [experience, setExperience] = useState<ExperienceWithRecommendations | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState('');

  const isNatureExperience = experience?.category === 'local_nature' || experience?.category === 'nature';

  const getUserLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permite el acceso a tu ubicacion para buscar senderos cerca');
        setLocationLoading(false);
        return null;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      setUserLocation(coords);
      setLocationLoading(false);
      return coords;
    } catch (err) {
      setLocationError('No se pudo obtener tu ubicacion');
      setLocationLoading(false);
      return null;
    }
  };

  const openMapSearch = async (searchQuery: string) => {
    let coords = userLocation;
    if (!coords) {
      coords = await getUserLocation();
    }

    if (coords) {
      // Google Maps search near user's location
      const url = Platform.select({
        ios: `maps://app?q=${encodeURIComponent(searchQuery)}&sll=${coords.lat},${coords.lng}&z=12`,
        android: `geo:${coords.lat},${coords.lng}?q=${encodeURIComponent(searchQuery)}`,
        default: `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}/@${coords.lat},${coords.lng},12z`
      });
      await Linking.openURL(url!);
    } else {
      // Fallback without location
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      await Linking.openURL(url);
    }
  };

  useEffect(() => {
    const fetchExperience = async () => {
      try {
        const response = await tripsApi.getExperience(id);
        setExperience(response.data);
      } catch (error) {
        console.error('Error fetching experience:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchExperience();
    if (token) {
      loadSavedExperiences(token);
    }
  }, [id, token]);

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

  if (loading || !experience) {
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
      case 'nature': case 'local_nature': return 'leaf';
      case 'beach': return 'sunny';
      case 'mountain': return 'triangle';
      case 'urban': case 'express': return 'flash';
      case 'retreat': return 'flower';
      case 'home': return 'home';
      case 'couple': return 'heart';
      default: return 'compass';
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'nature': return 'Naturaleza';
      case 'local_nature': return 'Naturaleza Local';
      case 'beach': return 'Playa';
      case 'mountain': return 'Montaña';
      case 'urban': return 'Urbano';
      case 'express': return 'Express';
      case 'retreat': return 'Retiro';
      case 'home': return 'En Casa';
      case 'couple': return 'Pareja';
      default: return category;
    }
  };

  const getMoodLabel = (mood: string) => {
    const labels: Record<string, string> = {
      need_change: 'Necesitas cambio',
      disconnect: 'Quieres desconectar',
      adventure: 'Ganas de aventura',
      couple: 'Planes de pareja',
      indecisive: 'No sabes qué hacer'
    };
    return labels[mood] || mood;
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: experience.image_url }} style={styles.heroImage} resizeMode="cover" />
          <View style={styles.imageOverlay} />
          
          <SafeAreaView style={styles.headerButtons}>
            <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textWhite} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton} onPress={handleSaveToggle}>
              <Ionicons name={isSaved ? 'heart' : 'heart-outline'} size={24} color={isSaved ? COLORS.error : COLORS.textWhite} />
            </TouchableOpacity>
          </SafeAreaView>

          <View style={styles.titleOverlay}>
            <View style={styles.categoryBadge}>
              <Ionicons name={getCategoryIcon(experience.category) as any} size={14} color={COLORS.textPrimary} />
              <Text style={styles.categoryText}>{getCategoryName(experience.category)}</Text>
            </View>
            <Text style={styles.heroTitle}>{experience.title}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.textWhite} />
              <Text style={styles.locationText}>{experience.location}</Text>
            </View>
          </View>
        </View>

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

          {/* Movie Recommendation */}
          {experience.movie_recommendation && (
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Ionicons name="film" size={22} color={COLORS.accent} />
                <Text style={styles.recommendationTitle}>Película recomendada</Text>
              </View>
              <Text style={styles.movieTitle}>{experience.movie_recommendation.title} ({experience.movie_recommendation.year})</Text>
              <Text style={styles.movieGenre}>{experience.movie_recommendation.genre}</Text>
              <Text style={styles.movieDescription}>{experience.movie_recommendation.description}</Text>
            </View>
          )}

          {/* Book & Coffee Recommendations */}
          {(experience.book_recommendation || experience.coffee_recommendation) && (
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Ionicons name="cafe" size={22} color={COLORS.accent} />
                <Text style={styles.recommendationTitle}>Recomendaciones</Text>
              </View>
              
              {experience.coffee_recommendation && (
                <View style={styles.recommendationItem}>
                  <Text style={styles.recommendationLabel}>Cafetería:</Text>
                  <Text style={styles.recommendationValue}>{experience.coffee_recommendation.name}</Text>
                  <Text style={styles.recommendationTip}>{experience.coffee_recommendation.tip}</Text>
                </View>
              )}
              
              {experience.book_recommendation && (
                <View style={styles.recommendationItem}>
                  <Text style={styles.recommendationLabel}>Libro sugerido:</Text>
                  <Text style={styles.recommendationValue}>"{experience.book_recommendation.title}"</Text>
                  <Text style={styles.recommendationAuthor}>por {experience.book_recommendation.author}</Text>
                </View>
              )}
            </View>
          )}

          {/* Food Recommendations */}
          {experience.food_recommendations && experience.food_recommendations.length > 0 && (
            <View style={styles.recommendationCard}>
              <View style={styles.recommendationHeader}>
                <Ionicons name="restaurant" size={22} color={COLORS.accent} />
                <Text style={styles.recommendationTitle}>Ideas para tu cena</Text>
              </View>
              {experience.food_recommendations.map((food, index) => (
                <View key={index} style={styles.foodItem}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodDescription}>{food.description}</Text>
                </View>
              ))}
            </View>
          )}

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
            <Text style={styles.sectionTitle}>Ideal para cuando</Text>
            <View style={styles.moodTagsContainer}>
              {experience.mood_tags.map((mood, index) => (
                <View key={index} style={styles.moodTag}>
                  <Text style={styles.moodTagText}>{getMoodLabel(mood)}</Text>
                </View>
              ))}
            </View>
          </View>

          {experience.is_travel && (
            <View style={styles.demoNote}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.demoNoteText}>
                Contenido demo. Próximamente: búsqueda de vuelos y hoteles según tu presupuesto.
              </Text>
            </View>
          )}

          {/* Nature / Trails Map Section */}
          {isNatureExperience && (
            <View style={styles.mapSection}>
              <Text style={styles.mapSectionTitle}>Encuentra senderos cerca de ti</Text>
              <Text style={styles.mapSectionSubtitle}>
                Usa tu ubicacion para descubrir rutas, bosques y senderos de trekking
              </Text>

              {locationError ? (
                <View style={styles.locationErrorBox}>
                  <Ionicons name="location-outline" size={18} color={COLORS.error} />
                  <Text style={styles.locationErrorText}>{locationError}</Text>
                </View>
              ) : null}

              <View style={styles.mapButtonsGrid}>
                <TouchableOpacity
                  style={styles.mapOptionCard}
                  onPress={() => openMapSearch('senderos senderismo hiking trails')}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <View style={[styles.mapOptionIcon, { backgroundColor: '#E8F5E9' }]}>
                      <Ionicons name="trail-sign" size={24} color="#2E7D32" />
                    </View>
                  )}
                  <Text style={styles.mapOptionLabel}>Senderos</Text>
                  <Text style={styles.mapOptionDesc}>Rutas de senderismo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mapOptionCard}
                  onPress={() => openMapSearch('bosques parques naturales forest')}
                  disabled={locationLoading}
                >
                  <View style={[styles.mapOptionIcon, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="leaf" size={24} color="#00695C" />
                  </View>
                  <Text style={styles.mapOptionLabel}>Bosques</Text>
                  <Text style={styles.mapOptionDesc}>Parques y bosques</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mapOptionCard}
                  onPress={() => openMapSearch('rutas trekking montaña mountain trails')}
                  disabled={locationLoading}
                >
                  <View style={[styles.mapOptionIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="trending-up" size={24} color="#E65100" />
                  </View>
                  <Text style={styles.mapOptionLabel}>Trekking</Text>
                  <Text style={styles.mapOptionDesc}>Rutas de montaña</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.mapOptionCard}
                  onPress={() => openMapSearch('miradores viewpoints nature')}
                  disabled={locationLoading}
                >
                  <View style={[styles.mapOptionIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="eye" size={24} color="#1565C0" />
                  </View>
                  <Text style={styles.mapOptionLabel}>Miradores</Text>
                  <Text style={styles.mapOptionDesc}>Vistas panoramicas</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.openFullMap}
                onPress={() => openMapSearch('senderismo trekking bosques naturaleza')}
              >
                <Ionicons name="map" size={20} color={COLORS.textWhite} />
                <Text style={styles.openFullMapText}>Abrir mapa completo</Text>
                <Ionicons name="open-outline" size={16} color={COLORS.textWhite} />
              </TouchableOpacity>

              <View style={styles.locationTip}>
                <Ionicons name="navigate-circle-outline" size={18} color={COLORS.accent} />
                <Text style={styles.locationTipText}>
                  Se usara tu ubicacion actual para mostrarte los lugares mas cercanos en Google Maps
                </Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {(!experience.is_home_activity || experience.id === 'exp-home-3' || isNatureExperience) && (
        <View style={styles.bottomCta}>
          <Button
            title={
              experience.id === 'exp-home-3'
                ? "Empezar carrera"
                : isNatureExperience
                  ? "Buscar senderos cerca"
                  : experience.is_travel
                    ? "Buscar vuelos y hoteles"
                    : "¡Hazlo ahora!"
            }
            onPress={() => {
              if (experience.id === 'exp-home-3') {
                router.push('/running-timer');
              } else if (isNatureExperience) {
                openMapSearch('senderos senderismo hiking trails naturaleza');
              } else if (experience.is_travel) {
                router.push('/travel-search');
              } else {
                handleBooking();
              }
            }}
            size="large"
            style={styles.bookButton}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  imageContainer: { height: height * 0.4, position: 'relative' },
  heroImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.3)' },
  headerButtons: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.md, paddingTop: SPACING.md },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  titleOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: SPACING.lg },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.textWhite, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm, alignSelf: 'flex-start', marginBottom: SPACING.sm },
  categoryText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary, marginLeft: 4 },
  heroTitle: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold, color: COLORS.textWhite, marginBottom: SPACING.xs },
  locationRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: FONTS.sizes.md, color: COLORS.textWhite, marginLeft: 4 },
  content: { padding: SPACING.lg, paddingBottom: 140 },
  quickInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.lg, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  infoText: { fontSize: FONTS.sizes.sm, color: COLORS.textPrimary, marginLeft: SPACING.xs },
  infoDivider: { width: 1, height: 24, backgroundColor: COLORS.border },
  section: { marginBottom: SPACING.lg },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  description: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24 },
  recommendationCard: { backgroundColor: '#FFF8F0', borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, borderLeftWidth: 4, borderLeftColor: COLORS.accent },
  recommendationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  recommendationTitle: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginLeft: SPACING.sm },
  movieTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  movieGenre: { fontSize: FONTS.sizes.sm, color: COLORS.accent, marginTop: 2 },
  movieDescription: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, lineHeight: 20 },
  recommendationItem: { marginBottom: SPACING.md },
  recommendationLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  recommendationValue: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  recommendationTip: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 2 },
  recommendationAuthor: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  foodItem: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.sm },
  foodName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  foodDescription: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  tag: { backgroundColor: `${COLORS.primary}15`, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
  tagText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: FONTS.weights.medium },
  moodTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  moodTag: { backgroundColor: `${COLORS.accent}20`, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
  moodTagText: { fontSize: FONTS.sizes.sm, color: COLORS.accentDark, fontWeight: FONTS.weights.medium },
  demoNote: { flexDirection: 'row', backgroundColor: COLORS.backgroundDark, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.md },
  demoNoteText: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginLeft: SPACING.sm, lineHeight: 20 },
  bottomCta: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.cardBackground, padding: SPACING.lg, paddingBottom: SPACING.xl, borderTopWidth: 1, borderTopColor: COLORS.border },
  bookButton: { width: '100%' },
  // Nature map styles
  mapSection: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg, marginTop: SPACING.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2
  },
  mapSectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  mapSectionSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  locationErrorBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE8E8',
    borderRadius: BORDER_RADIUS.md, padding: SPACING.sm, marginBottom: SPACING.md
  },
  locationErrorText: { fontSize: FONTS.sizes.sm, color: COLORS.error, marginLeft: SPACING.xs, flex: 1 },
  mapButtonsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  mapOptionCard: {
    width: '48%', backgroundColor: COLORS.backgroundDark, borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, alignItems: 'center', marginBottom: SPACING.xs
  },
  mapOptionIcon: {
    width: 48, height: 48, borderRadius: 24, justifyContent: 'center',
    alignItems: 'center', marginBottom: SPACING.xs
  },
  mapOptionLabel: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  mapOptionDesc: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  openFullMap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, marginTop: SPACING.md, gap: SPACING.sm
  },
  openFullMapText: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textWhite },
  locationTip: {
    flexDirection: 'row', backgroundColor: '#FFF8F0', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm, marginTop: SPACING.md
  },
  locationTipText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginLeft: SPACING.xs, lineHeight: 16 }
});
