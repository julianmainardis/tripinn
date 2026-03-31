import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMoodStore, Experience } from '../../src/store/moodStore';
import { useAuthStore } from '../../src/store/authStore';
import { ExperienceCard } from '../../src/components/ExperienceCard';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../../src/constants/theme';

const CATEGORIES = [
  { id: 'all', name: 'Todos', icon: 'grid' },
  { id: 'express', name: 'Express', icon: 'flash' },
  { id: 'home', name: 'En Casa', icon: 'home' },
  { id: 'local_nature', name: 'Naturaleza Local', icon: 'leaf' },
  { id: 'couple', name: 'Pareja', icon: 'heart' },
  { id: 'travel', name: 'Escapadas', icon: 'airplane' }
];

export default function ExploreScreen() {
  const router = useRouter();
  const { token } = useAuthStore();
  const { allExperiences, loadAllExperiences, savedExperiences, loadSavedExperiences, saveExperience, unsaveExperience } = useMoodStore();
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    loadAllExperiences();
    if (token) {
      loadSavedExperiences(token);
    }
  }, [token]);

  const filteredExperiences = React.useMemo(() => {
    if (selectedCategory === 'all') return allExperiences;
    if (selectedCategory === 'express') return allExperiences.filter(exp => exp.is_express);
    if (selectedCategory === 'home') return allExperiences.filter(exp => exp.is_home_activity);
    if (selectedCategory === 'local_nature') return allExperiences.filter(exp => exp.category === 'local_nature');
    if (selectedCategory === 'travel') return allExperiences.filter(exp => (exp as any).is_travel);
    return allExperiences.filter(exp => exp.category === selectedCategory);
  }, [selectedCategory, allExperiences]);

  const isSaved = (experienceId: string) => savedExperiences.some(exp => exp.id === experienceId);

  const handleSaveToggle = async (experienceId: string) => {
    if (!token) return;
    if (isSaved(experienceId)) {
      await unsaveExperience(experienceId, token);
    } else {
      await saveExperience(experienceId, token);
    }
  };

  const getCategoryDescription = () => {
    switch (selectedCategory) {
      case 'express': return 'Planes rápidos en tu ciudad';
      case 'home': return 'Actividades para hacer en casa';
      case 'local_nature': return 'Trekking y naturaleza cerca de ti';
      case 'couple': return 'Experiencias románticas para dos';
      case 'travel': return 'Escapadas para desconectar';
      default: return 'Descubre experiencias que transforman';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorar</Text>
        <Text style={styles.subtitle}>{getCategoryDescription()}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesContainer} contentContainerStyle={styles.categoriesContent}>
        {CATEGORIES.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[styles.categoryButton, selectedCategory === category.id && styles.categoryButtonActive]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Ionicons
              name={category.icon as any}
              size={18}
              color={selectedCategory === category.id ? COLORS.textWhite : COLORS.textSecondary}
            />
            <Text style={[styles.categoryText, selectedCategory === category.id && styles.categoryTextActive]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filteredExperiences}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <ExperienceCard
            experience={item}
            onPress={() => router.push(`/experience/${item.id}`)}
            onSave={() => handleSaveToggle(item.id)}
            isSaved={isSaved(item.id)}
            compact
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="compass-outline" size={64} color={COLORS.textLight} />
            <Text style={styles.emptyText}>No hay experiencias en esta categoría</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, paddingBottom: SPACING.md },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs },
  categoriesContainer: { maxHeight: 50 },
  categoriesContent: { paddingHorizontal: SPACING.lg, gap: SPACING.sm },
  categoryButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.cardBackground, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, borderRadius: BORDER_RADIUS.full, gap: SPACING.xs, marginRight: SPACING.sm },
  categoryButtonActive: { backgroundColor: COLORS.primary },
  categoryText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: FONTS.weights.medium },
  categoryTextActive: { color: COLORS.textWhite },
  listContent: { padding: SPACING.lg, paddingTop: SPACING.md },
  row: { justifyContent: 'space-between' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: SPACING.xxl },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.md }
});
