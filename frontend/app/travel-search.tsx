import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components/Button';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface Destination {
  destination: string;
  country: string;
  image: string;
  flight_price: number;
  hotel_price_per_night: number;
  hotel_total: number;
  total_estimated: number;
  nights: number;
  within_budget: boolean;
  savings: number;
}

interface SearchResult {
  origin: string;
  max_budget: number;
  dates: { from: string; to: string; nights: number };
  budget_breakdown: { max_flight: number; max_hotel_per_night: number };
  destinations: Destination[];
  note: string;
}

export default function TravelSearchScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  
  const [origin, setOrigin] = useState(user?.city || '');
  const [budget, setBudget] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!origin || !budget || !dateFrom || !dateTo) {
      setError('Por favor completa todos los campos');
      return;
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setError('El presupuesto debe ser un número válido');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await axios.post(
        `${API_URL}/api/travel/search`,
        {
          origin,
          max_budget: budgetNum,
          date_from: dateFrom,
          date_to: dateTo
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResults(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al buscar destinos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Buscar Escapada</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Search Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>¿A dónde quieres ir?</Text>
            <Text style={styles.formSubtitle}>Te buscaremos opciones según tu presupuesto</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ciudad de origen</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="airplane-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej: Madrid"
                  value={origin}
                  onChangeText={setOrigin}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Presupuesto máximo (€)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="wallet-outline" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Ej: 500"
                  value={budget}
                  onChangeText={setBudget}
                  keyboardType="numeric"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>
            </View>

            <View style={styles.dateRow}>
              <View style={[styles.inputGroup, styles.dateInput]}>
                <Text style={styles.label}>Fecha ida</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={dateFrom}
                    onChangeText={setDateFrom}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.dateInput]}>
                <Text style={styles.label}>Fecha vuelta</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={dateTo}
                    onChangeText={setDateTo}
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Button
              title="Buscar destinos"
              onPress={handleSearch}
              loading={loading}
              size="large"
              style={styles.searchButton}
            />

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.accent} />
              <Text style={styles.infoText}>
                Buscamos vuelos (máx 50% del presupuesto) y hoteles (máx 10% por noche) para encontrar la mejor combinación.
              </Text>
            </View>
          </View>

          {/* Results */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Buscando las mejores opciones...</Text>
            </View>
          )}

          {results && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>
                {results.destinations.length > 0 
                  ? `${results.destinations.length} destinos encontrados`
                  : 'No encontramos destinos con ese presupuesto'}
              </Text>
              
              {results.destinations.length > 0 && (
                <Text style={styles.resultsSubtitle}>
                  {results.dates.nights} noches • Presupuesto: {results.max_budget}€
                </Text>
              )}

              {results.destinations.map((dest, index) => (
                <View key={index} style={styles.destinationCard}>
                  <Image source={{ uri: dest.image }} style={styles.destImage} resizeMode="cover" />
                  <View style={styles.destOverlay} />
                  <View style={styles.destContent}>
                    <View style={styles.destHeader}>
                      <View>
                        <Text style={styles.destCity}>{dest.destination}</Text>
                        <Text style={styles.destCountry}>{dest.country}</Text>
                      </View>
                      {dest.within_budget && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>Ahorras {dest.savings}€</Text>
                        </View>
                      )}
                    </View>
                    
                    <View style={styles.priceBreakdown}>
                      <View style={styles.priceItem}>
                        <Ionicons name="airplane" size={16} color={COLORS.textWhite} />
                        <Text style={styles.priceLabel}>Vuelos i/v</Text>
                        <Text style={styles.priceValue}>{dest.flight_price}€</Text>
                      </View>
                      <View style={styles.priceItem}>
                        <Ionicons name="bed" size={16} color={COLORS.textWhite} />
                        <Text style={styles.priceLabel}>{dest.nights} noches</Text>
                        <Text style={styles.priceValue}>{dest.hotel_total}€</Text>
                      </View>
                      <View style={[styles.priceItem, styles.totalPrice]}>
                        <Text style={styles.totalLabel}>Total estimado</Text>
                        <Text style={styles.totalValue}>{dest.total_estimated}€</Text>
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              <Text style={styles.disclaimer}>{results.note}</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  placeholder: { width: 44 },
  scrollContent: { padding: SPACING.lg },
  formCard: { backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg, shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  formTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  formSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundDark, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  input: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, marginLeft: SPACING.sm, paddingVertical: SPACING.xs },
  dateRow: { flexDirection: 'row', gap: SPACING.md },
  dateInput: { flex: 1 },
  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm, marginBottom: SPACING.md },
  searchButton: { marginTop: SPACING.md },
  infoBox: { flexDirection: 'row', backgroundColor: '#FFF8F0', borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginTop: SPACING.lg },
  infoText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginLeft: SPACING.sm, lineHeight: 18 },
  loadingContainer: { alignItems: 'center', marginTop: SPACING.xl },
  loadingText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.md },
  resultsSection: { marginTop: SPACING.xl },
  resultsTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  resultsSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  destinationCard: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.lg, height: 220 },
  destImage: { width: '100%', height: '100%' },
  destOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  destContent: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: SPACING.md, justifyContent: 'space-between' },
  destHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  destCity: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textWhite },
  destCountry: { fontSize: FONTS.sizes.sm, color: COLORS.textWhite, opacity: 0.9 },
  savingsBadge: { backgroundColor: COLORS.success, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: BORDER_RADIUS.sm },
  savingsText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, color: COLORS.textWhite },
  priceBreakdown: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm },
  priceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  priceLabel: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textWhite, marginLeft: SPACING.sm },
  priceValue: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.textWhite },
  totalPrice: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)', paddingTop: SPACING.xs, marginTop: SPACING.xs },
  totalLabel: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textWhite },
  totalValue: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textWhite },
  disclaimer: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: SPACING.md }
});
