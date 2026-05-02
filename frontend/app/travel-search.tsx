import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Image, ActivityIndicator, KeyboardAvoidingView, Platform, Linking,
  FlatList, Modal, Keyboard, LayoutChangeEvent
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components/Button';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';
import { tripsApi } from '../src/features/trips/api/tripsApi';

// ==================== TYPES ====================

interface Airport {
  code: string;
  city: string;
  country: string;
  name: string;
}

interface Destination {
  destination_code: string;
  destination: string;
  country: string;
  image: string;
  flight_estimate: number;
  hotel_estimate_per_night: number;
  hotel_estimate_total: number;
  total_estimate: number;
  nights: number;
  adults: number;
  within_budget: boolean;
  savings_estimate: number;
  flights_url: string;
  hotels_url: string;
  is_estimate: boolean;
}

interface SearchResult {
  origin: { code: string; city: string };
  search_params: {
    max_budget: number;
    date_from: string;
    date_to: string;
    nights: number;
    adults: number;
  };
  budget_breakdown: {
    max_for_flights: number;
    max_for_hotel_per_night: number;
  };
  destinations: Destination[];
  note: string;
}

// ==================== CALENDAR COMPONENT ====================

const DAYS_OF_WEEK = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa', 'Do'];
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

interface CalendarPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectRange: (departure: Date, returnDate: Date) => void;
  departureDate: Date | null;
  returnDate: Date | null;
  minimumDate?: Date;
  title: string;
}

function CalendarPicker({ visible, onClose, onSelectRange, departureDate, returnDate, minimumDate, title }: CalendarPickerProps) {
  const today = new Date();
  const minDate = minimumDate || today;
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [tempDeparture, setTempDeparture] = useState<Date | null>(null);
  const [tempReturn, setTempReturn] = useState<Date | null>(null);

  useEffect(() => {
    if (visible) {
      setTempDeparture(departureDate);
      setTempReturn(returnDate);
      setViewMonth(departureDate ? departureDate.getMonth() : today.getMonth());
      setViewYear(departureDate ? departureDate.getFullYear() : today.getFullYear());
    }
  }, [visible]);

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isDateDisabled = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    const min = new Date(minDate);
    min.setHours(0, 0, 0, 0);
    return date < min;
  };

  const isDateInPast = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);
    date.setHours(0, 0, 0, 0);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return date < now;
  };

  const isDepartureSelected = (day: number) => {
    if (!tempDeparture) return false;
    return tempDeparture.getDate() === day &&
      tempDeparture.getMonth() === viewMonth &&
      tempDeparture.getFullYear() === viewYear;
  };

  const isReturnSelected = (day: number) => {
    if (!tempReturn) return false;
    return tempReturn.getDate() === day &&
      tempReturn.getMonth() === viewMonth &&
      tempReturn.getFullYear() === viewYear;
  };

  const isInRange = (day: number) => {
    if (!tempDeparture || !tempReturn) return false;
    const date = new Date(viewYear, viewMonth, day);
    return date > tempDeparture && date < tempReturn;
  };

  const isRangeStart = (day: number) => isDepartureSelected(day);
  const isRangeEnd = (day: number) => isReturnSelected(day);

  const isToday = (day: number) => {
    return today.getDate() === day &&
      today.getMonth() === viewMonth &&
      today.getFullYear() === viewYear;
  };

  const canGoPrev = () => {
    const prevDate = new Date(viewYear, viewMonth - 1, 1);
    const minMonth = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    return prevDate >= minMonth;
  };

  const handleDayPress = (day: number) => {
    const date = new Date(viewYear, viewMonth, day);

    if (!tempDeparture || (tempDeparture && tempReturn)) {
      setTempDeparture(date);
      setTempReturn(null);
    } else if (date <= tempDeparture) {
      setTempDeparture(date);
      setTempReturn(null);
    } else {
      setTempReturn(date);
    }
  };

  const handleConfirm = () => {
    if (tempDeparture && tempReturn) {
      onSelectRange(tempDeparture, tempReturn);
    }
    onClose();
  };

  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);
  const calendarDays = [];

  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={calStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={calStyles.container}>
          <Text style={calStyles.title}>{title}</Text>

          <View style={calStyles.selectionInfo}>
            <Text style={calStyles.selectionHint}>
              {!tempDeparture ? 'Selecciona fecha de ida' :
               !tempReturn ? 'Selecciona fecha de vuelta' :
               'Fechas seleccionadas'}
            </Text>
          </View>

          <View style={calStyles.monthNav}>
            <TouchableOpacity onPress={goToPrevMonth} disabled={!canGoPrev()} style={calStyles.navButton}>
              <Ionicons name="chevron-back" size={22} color={canGoPrev() ? COLORS.textPrimary : COLORS.textLight} />
            </TouchableOpacity>
            <Text style={calStyles.monthLabel}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={calStyles.navButton}>
              <Ionicons name="chevron-forward" size={22} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={calStyles.weekRow}>
            {DAYS_OF_WEEK.map((d) => (
              <Text key={d} style={calStyles.weekDay}>{d}</Text>
            ))}
          </View>

          <View style={calStyles.daysGrid}>
            {calendarDays.map((day, idx) => {
              if (day === null) {
                return <View key={`empty-${idx}`} style={calStyles.dayCell} />;
              }
              const disabled = isDateDisabled(day);
              const inPast = isDateInPast(day);
              const depSelected = isDepartureSelected(day);
              const retSelected = isReturnSelected(day);
              const inRange = isInRange(day);
              const rangeStart = isRangeStart(day);
              const rangeEnd = isRangeEnd(day);
              const todayMark = isToday(day);

              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    calStyles.dayCell,
                    depSelected && calStyles.dayCellSelected,
                    retSelected && calStyles.dayCellSelected,
                    inRange && calStyles.dayCellInRange,
                    rangeStart && calStyles.dayCellRangeStart,
                    rangeEnd && calStyles.dayCellRangeEnd,
                    todayMark && !depSelected && !retSelected && calStyles.dayCellToday
                  ]}
                  disabled={disabled || inPast}
                  onPress={() => handleDayPress(day)}
                >
                  <Text style={[
                    calStyles.dayText,
                    (disabled || inPast) && calStyles.dayTextDisabled,
                    (depSelected || retSelected) && calStyles.dayTextSelected,
                    inRange && calStyles.dayTextInRange,
                    todayMark && !depSelected && !retSelected && calStyles.dayTextToday
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={calStyles.bottomRow}>
            <TouchableOpacity onPress={onClose} style={calStyles.cancelButton}>
              <Text style={calStyles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[calStyles.confirmButton, (!tempDeparture || !tempReturn) && calStyles.confirmButtonDisabled]}
              disabled={!tempDeparture || !tempReturn}
            >
              <Text style={[calStyles.confirmText, (!tempDeparture || !tempReturn) && calStyles.confirmTextDisabled]}>
                Confirmar
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const calStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg
  },
  container: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 380
  },
  title: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm
  },
  selectionInfo: {
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  selectionHint: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium
  },
  monthNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md
  },
  navButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center'
  },
  monthLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.full
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary
  },
  dayCellInRange: {
    backgroundColor: `${COLORS.primary}20`
  },
  dayCellRangeStart: {
    backgroundColor: COLORS.primary,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  dayCellRangeEnd: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  dayCellToday: {
    backgroundColor: `${COLORS.primary}15`
  },
  dayText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary
  },
  dayTextDisabled: {
    color: COLORS.textLight
  },
  dayTextSelected: {
    color: COLORS.textWhite,
    fontWeight: FONTS.weights.bold
  },
  dayTextInRange: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.medium
  },
  dayTextToday: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    gap: SPACING.md
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md
  },
  cancelText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary
  },
  confirmButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.textLight,
    opacity: 0.5
  },
  confirmText: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textWhite
  },
  confirmTextDisabled: {
    color: COLORS.textSecondary
  }
});

// ==================== MAIN SCREEN ====================

export default function TravelSearchScreen() {
  const router = useRouter();
  const { token, user } = useAuthStore();

  // Form state
  const [originQuery, setOriginQuery] = useState('');
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const [airportResults, setAirportResults] = useState<Airport[]>([]);
  const [showAirportDropdown, setShowAirportDropdown] = useState(false);
  const [airportLoading, setAirportLoading] = useState(false);

  const [budget, setBudget] = useState('');
  const [adults, setAdults] = useState(2);

  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [error, setError] = useState('');

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainScrollRef = useRef<ScrollView>(null);
  const resultsRef = useRef<number>(0);

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format date for API
  const formatDateAPI = (date: Date | null): string => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Airport search with debounce
  const handleAirportSearch = useCallback((text: string) => {
    setOriginQuery(text);
    setSelectedAirport(null);

    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    if (text.length < 2) {
      setAirportResults([]);
      setShowAirportDropdown(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setAirportLoading(true);
      try {
        const response = await tripsApi.airportSearch(text);
        setAirportResults(response.data);
        setShowAirportDropdown(response.data.length > 0);
      } catch (err) {
        console.error('Airport search error:', err);
        setAirportResults([]);
      } finally {
        setAirportLoading(false);
      }
    }, 300);
  }, []);

  const selectAirport = (airport: Airport) => {
    setSelectedAirport(airport);
    setOriginQuery(`${airport.city} (${airport.code})`);
    setShowAirportDropdown(false);
    setAirportResults([]);
    Keyboard.dismiss();
  };

  // Handle date range selection
  const handleDateRangeSelect = (departure: Date, returnDate: Date) => {
    setDateFrom(departure);
    setDateTo(returnDate);
  };

  // Adults counter
  const incrementAdults = () => {
    if (adults < 6) setAdults(adults + 1);
  };
  const decrementAdults = () => {
    if (adults > 1) setAdults(adults - 1);
  };

  const handleSearch = async () => {
    Keyboard.dismiss();

    if (!selectedAirport) {
      setError('Selecciona una ciudad de origen de la lista');
      return;
    }
    if (!budget) {
      setError('Introduce un presupuesto');
      return;
    }
    if (!dateFrom || !dateTo) {
      setError('Selecciona las fechas de ida y vuelta');
      return;
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      setError('El presupuesto debe ser un numero valido');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await tripsApi.searchTravel(
        {
          origin_code: selectedAirport.code,
          origin_city: selectedAirport.city,
          max_budget: budgetNum,
          date_from: formatDateAPI(dateFrom),
          date_to: formatDateAPI(dateTo),
          adults: adults
        },
        token ?? ''
      );
      setResults(response.data);
      setTimeout(() => {
        mainScrollRef.current?.scrollTo({
          y: resultsRef.current - 80,
          animated: true,
        });
      }, 200);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al buscar destinos');
    } finally {
      setLoading(false);
    }
  };

  const openExternalLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback: try opening anyway
        await Linking.openURL(url);
      }
    } catch (err) {
      console.error('Error opening URL:', err);
    }
  };

  const getNightsText = () => {
    if (!dateFrom || !dateTo) return '';
    const diff = Math.ceil((dateTo.getTime() - dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    return `${diff} noche${diff !== 1 ? 's' : ''}`;
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

        <ScrollView
          ref={mainScrollRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Search Form */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Encuentra tu destino ideal</Text>
            <Text style={styles.formSubtitle}>Te buscaremos vuelos y hoteles segun tu presupuesto</Text>

            {/* Origin Airport Autocomplete */}
            <View style={[styles.inputGroup, { zIndex: 100 }]}>
              <Text style={styles.label}>Ciudad de origen</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="airplane-outline" size={20} color={selectedAirport ? COLORS.primary : COLORS.textSecondary} />
                <TextInput
                  style={styles.input}
                  placeholder="Escribe tu ciudad..."
                  value={originQuery}
                  onChangeText={handleAirportSearch}
                  placeholderTextColor={COLORS.textLight}
                  onFocus={() => {
                    if (airportResults.length > 0) setShowAirportDropdown(true);
                  }}
                />
                {airportLoading && <ActivityIndicator size="small" color={COLORS.primary} />}
                {selectedAirport && (
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                )}
              </View>

              {/* Airport dropdown */}
              {showAirportDropdown && airportResults.length > 0 && (
                <View style={styles.autocompleteDropdown}>
                  <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                    {airportResults.map((airport) => (
                      <TouchableOpacity
                        key={airport.code}
                        style={styles.airportItem}
                        onPress={() => selectAirport(airport)}
                      >
                        <View style={styles.airportItemLeft}>
                          <Text style={styles.airportCode}>{airport.code}</Text>
                        </View>
                        <View style={styles.airportItemRight}>
                          <Text style={styles.airportCity}>{airport.city}</Text>
                          <Text style={styles.airportCountry}>{airport.country} - {airport.name}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Budget */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Presupuesto maximo total</Text>
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
                <Text style={styles.currencyLabel}>EUR</Text>
              </View>
            </View>

            {/* Date Picker - Combined Range */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Fechas de viaje</Text>
              <TouchableOpacity
                style={styles.inputContainer}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={dateFrom ? COLORS.primary : COLORS.textSecondary} />
                <View style={styles.dateRangeDisplay}>
                  <Text style={[styles.dateText, !dateFrom && styles.dateTextPlaceholder]}>
                    {dateFrom ? formatDate(dateFrom) : 'Ida'}
                  </Text>
                  <Ionicons name="arrow-forward" size={14} color={COLORS.textLight} style={{ marginHorizontal: 4 }} />
                  <Text style={[styles.dateText, !dateTo && styles.dateTextPlaceholder]}>
                    {dateTo ? formatDate(dateTo) : 'Vuelta'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {dateFrom && dateTo && (
              <View style={styles.nightsBadge}>
                <Ionicons name="moon-outline" size={16} color={COLORS.primary} />
                <Text style={styles.nightsText}>{getNightsText()}</Text>
              </View>
            )}

            {/* Adults counter */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Viajeros</Text>
              <View style={styles.adultsRow}>
                <TouchableOpacity
                  style={[styles.adultsButton, adults <= 1 && styles.adultsButtonDisabled]}
                  onPress={decrementAdults}
                  disabled={adults <= 1}
                >
                  <Ionicons name="remove" size={20} color={adults <= 1 ? COLORS.textLight : COLORS.textPrimary} />
                </TouchableOpacity>
                <View style={styles.adultsDisplay}>
                  <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                  <Text style={styles.adultsCount}>{adults}</Text>
                  <Text style={styles.adultsLabel}>adulto{adults !== 1 ? 's' : ''}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.adultsButton, adults >= 6 && styles.adultsButtonDisabled]}
                  onPress={incrementAdults}
                  disabled={adults >= 6}
                >
                  <Ionicons name="add" size={20} color={adults >= 6 ? COLORS.textLight : COLORS.textPrimary} />
                </TouchableOpacity>
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
                Precios reales de vuelos. Los enlaces te llevan a Skyscanner y Booking para reservar directamente a los mejores precios.
              </Text>
            </View>
          </View>

          {/* Loading */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Buscando las mejores opciones...</Text>
            </View>
          )}

          {/* Results */}
          {results && (
            <View
              ref={(el) => {
                if (el) {
                  el.measure((_x, _y, _w, h, _px, py) => {
                    resultsRef.current = py;
                  });
                }
              }}
              style={styles.resultsSection}
              onLayout={(e) => {
                resultsRef.current = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.resultsTitle}>
                {results.destinations.length > 0
                  ? `${results.destinations.length} destinos encontrados`
                  : 'No encontramos destinos con ese presupuesto'}
              </Text>

              {results.destinations.length > 0 && (
                <Text style={styles.resultsSubtitle}>
                  {results.search_params.nights} noches - Presupuesto: {results.search_params.max_budget} EUR
                </Text>
              )}

              {results.destinations.length === 0 && (
                <View style={styles.noResultsCard}>
                  <Ionicons name="search-outline" size={48} color={COLORS.textLight} />
                  <Text style={styles.noResultsText}>
                    Prueba con un presupuesto mayor o fechas diferentes
                  </Text>
                </View>
              )}

              {results.destinations.map((dest, index) => (
                <View key={`${dest.destination_code}-${index}`} style={styles.destinationCard}>
                  <Image source={{ uri: dest.image }} style={styles.destImage} resizeMode="cover" />
                  <View style={styles.destOverlay} />
                  <View style={styles.destContent}>
                    <View style={styles.destHeader}>
                      <View>
                        <Text style={styles.destCity}>{dest.destination}</Text>
                        <Text style={styles.destCountry}>{dest.country}</Text>
                      </View>
                      {dest.within_budget && dest.savings_estimate > 0 && (
                        <View style={styles.savingsBadge}>
                          <Text style={styles.savingsText}>Ahorras {Math.round(dest.savings_estimate)} EUR</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.priceBreakdown}>
                      <View style={styles.priceItem}>
                        <Ionicons name="airplane" size={16} color={COLORS.textWhite} />
                        <Text style={styles.priceLabel}>Vuelos i/v ({dest.adults} pers.)</Text>
                        <Text style={styles.priceValue}>{Math.round(dest.flight_estimate)} EUR</Text>
                      </View>
                      <View style={styles.priceItem}>
                        <Ionicons name="bed" size={16} color={COLORS.textWhite} />
                        <Text style={styles.priceLabel}>{dest.nights} noches ({Math.round(dest.hotel_estimate_per_night)} EUR/noche)</Text>
                        <Text style={styles.priceValue}>{Math.round(dest.hotel_estimate_total)} EUR</Text>
                      </View>
                      <View style={[styles.priceItem, styles.totalPrice]}>
                        <Text style={styles.totalLabel}>Total estimado</Text>
                        <Text style={styles.totalValue}>{Math.round(dest.total_estimate)} EUR</Text>
                      </View>
                    </View>

                    {/* Action buttons: Skyscanner + Booking */}
                    <View style={styles.linkButtonsRow}>
                      <TouchableOpacity
                        style={styles.linkButtonPrimary}
                        onPress={() => openExternalLink(dest.flights_url)}
                      >
                        <Ionicons name="airplane" size={16} color={COLORS.textWhite} />
                        <Text style={styles.linkButtonTextPrimary}>Ver vuelos en Skyscanner</Text>
                        <Ionicons name="open-outline" size={14} color={COLORS.textWhite} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.linkButtonsRow}>
                      <TouchableOpacity
                        style={styles.linkButtonSecondary}
                        onPress={() => openExternalLink(dest.hotels_url)}
                      >
                        <Ionicons name="bed" size={16} color={COLORS.accent} />
                        <Text style={[styles.linkButtonTextSecondary, { color: COLORS.accent }]}>Ver hoteles en Booking</Text>
                        <Ionicons name="open-outline" size={14} color={COLORS.textLight} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {dest.is_estimate && (
                    <View style={styles.estimateBadge}>
                      <Text style={styles.estimateText}>Precio estimado</Text>
                    </View>
                  )}
                </View>
              ))}

              {results.destinations.length > 0 && (
                <View style={styles.disclaimerCard}>
                  <Ionicons name="information-circle" size={20} color={COLORS.accent} />
                  <Text style={styles.disclaimerText}>
                    {results.note}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Calendar Modal */}
      <CalendarPicker
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onSelectRange={handleDateRangeSelect}
        departureDate={dateFrom}
        returnDate={dateTo}
        minimumDate={new Date()}
        title="Selecciona fechas de viaje"
      />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  placeholder: { width: 44 },
  scrollContent: { padding: SPACING.lg },
  formCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.xl, padding: SPACING.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
    shadowRadius: 8, elevation: 3
  },
  formTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  formSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.lg },
  inputGroup: { marginBottom: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    minHeight: 48
  },
  input: {
    flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary,
    marginLeft: SPACING.sm, paddingVertical: SPACING.xs
  },
  currencyLabel: {
    fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.primary,
    marginLeft: SPACING.sm
  },

  // Autocomplete dropdown
  autocompleteDropdown: {
    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 8, zIndex: 1000
  },
  dropdownScroll: { maxHeight: 200 },
  airportItem: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.backgroundDark
  },
  airportItemLeft: {
    backgroundColor: `${COLORS.primary}15`, borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 4, marginRight: SPACING.md
  },
  airportCode: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.bold, color: COLORS.primary },
  airportItemRight: { flex: 1 },
  airportCity: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.medium, color: COLORS.textPrimary },
  airportCountry: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },

  // Dates
  dateRow: { flexDirection: 'row', gap: SPACING.md },
  dateInput: { flex: 1 },
  dateText: {
    flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary, marginLeft: SPACING.sm,
    paddingVertical: SPACING.xs
  },
  dateTextPlaceholder: { color: COLORS.textLight },
  dateRangeDisplay: {
    flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: SPACING.sm,
    paddingVertical: SPACING.xs
  },
  nightsBadge: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${COLORS.primary}10`, borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md, marginBottom: SPACING.md,
    alignSelf: 'center'
  },
  nightsText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: FONTS.weights.medium, marginLeft: SPACING.xs },

  // Adults
  adultsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.backgroundDark, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md
  },
  adultsButton: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.cardBackground,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 2, elevation: 1
  },
  adultsButtonDisabled: { opacity: 0.4 },
  adultsDisplay: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs },
  adultsCount: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  adultsLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },

  errorText: { color: COLORS.error, fontSize: FONTS.sizes.sm, marginBottom: SPACING.md, textAlign: 'center' },
  searchButton: { marginTop: SPACING.md },
  infoBox: {
    flexDirection: 'row', backgroundColor: '#FFF8F0', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.lg
  },
  infoText: { flex: 1, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginLeft: SPACING.sm, lineHeight: 18 },

  // Loading
  loadingContainer: { alignItems: 'center', marginTop: SPACING.xl },
  loadingText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.md },

  // Results
  resultsSection: { marginTop: SPACING.xl },
  resultsTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  resultsSubtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  noResultsCard: {
    alignItems: 'center', paddingVertical: SPACING.xl,
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.md
  },
  noResultsText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.md, textAlign: 'center' },

  // Destination card
  destinationCard: {
    borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', marginBottom: SPACING.lg,
    minHeight: 300
  },
  destImage: { width: '100%', height: '100%', position: 'absolute' },
  destOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  destContent: {
    flex: 1, padding: SPACING.md, justifyContent: 'space-between'
  },
  destHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  destCity: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textWhite },
  destCountry: { fontSize: FONTS.sizes.sm, color: COLORS.textWhite, opacity: 0.9 },
  savingsBadge: {
    backgroundColor: COLORS.success, paddingHorizontal: SPACING.sm, paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm
  },
  savingsText: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.semibold, color: COLORS.textWhite },
  priceBreakdown: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BORDER_RADIUS.md, padding: SPACING.sm,
    marginTop: SPACING.sm
  },
  priceItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  priceLabel: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textWhite, marginLeft: SPACING.sm },
  priceValue: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.textWhite },
  totalPrice: {
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.3)',
    paddingTop: SPACING.xs, marginTop: SPACING.xs
  },
  totalLabel: { flex: 1, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.textWhite },
  totalValue: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textWhite },

  // Link buttons
  linkButtonsRow: {
    flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm
  },
  linkButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, gap: 4
  },
  linkButtonText: {
    fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.primary
  },
  linkButtonPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, gap: 6
  },
  linkButtonTextPrimary: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textWhite
  },
  linkButtonSecondary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.sm, gap: 4,
    borderWidth: 1.5, borderColor: COLORS.primary,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 3, elevation: 2,
  },
  linkButtonTextSecondary: {
    fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold
  },

  // Estimate badge
  estimateBadge: {
    position: 'absolute', top: SPACING.sm, right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm, paddingVertical: 2
  },
  estimateText: { fontSize: FONTS.sizes.xs, color: COLORS.textWhite, fontStyle: 'italic' },

  // Disclaimer
  disclaimerCard: {
    flexDirection: 'row', backgroundColor: '#FFF8F0', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.sm, marginBottom: SPACING.xl
  },
  disclaimerText: {
    flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginLeft: SPACING.sm, lineHeight: 20
  }
});
