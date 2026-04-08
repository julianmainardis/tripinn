import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Vibration, Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';

const DISTANCES = [
  { km: 3, label: '3 km', estimatedMinutes: '15-20 min', icon: 'walk-outline' },
  { km: 5, label: '5 km', estimatedMinutes: '25-35 min', icon: 'fitness-outline' },
  { km: 10, label: '10 km', estimatedMinutes: '50-70 min', icon: 'trophy-outline' },
];

type TimerStatus = 'idle' | 'running' | 'paused' | 'finished';

export default function RunningTimerScreen() {
  const router = useRouter();

  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const [timerStatus, setTimerStatus] = useState<TimerStatus>('idle');
  const [elapsedMs, setElapsedMs] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const centiseconds = Math.floor((ms % 1000) / 10);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  };

  const getPace = () => {
    if (!selectedDistance || elapsedMs === 0) return '--:--';
    const totalMinutes = elapsedMs / 60000;
    const pacePerKm = totalMinutes / selectedDistance;
    const paceMin = Math.floor(pacePerKm);
    const paceSec = Math.round((pacePerKm - paceMin) * 60);
    return `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
  };

  const startTimer = useCallback(() => {
    if (!selectedDistance) return;

    if (timerStatus === 'paused') {
      // Resume
      startTimeRef.current = Date.now();
      setTimerStatus('running');
    } else {
      // Fresh start
      accumulatedRef.current = 0;
      setElapsedMs(0);
      startTimeRef.current = Date.now();
      setTimerStatus('running');
    }

    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const current = accumulatedRef.current + (now - startTimeRef.current);
      setElapsedMs(current);
    }, 50);
  }, [selectedDistance, timerStatus]);

  const pauseTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    accumulatedRef.current = elapsedMs;
    setTimerStatus('paused');
  }, [elapsedMs]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerStatus('finished');
    if (Platform.OS !== 'web') {
      Vibration.vibrate(500);
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    accumulatedRef.current = 0;
    setElapsedMs(0);
    setTimerStatus('idle');
  }, []);

  const getMotivationalMessage = () => {
    if (timerStatus === 'finished') {
      const mins = Math.floor(elapsedMs / 60000);
      if (mins < 20) return 'Increible ritmo!';
      if (mins < 40) return 'Gran carrera!';
      return 'Resistencia de campeon!';
    }
    if (timerStatus === 'running') {
      const mins = Math.floor(elapsedMs / 60000);
      if (mins < 5) return 'Buen comienzo, sigue asi!';
      if (mins < 15) return 'Vas genial, no pares!';
      if (mins < 30) return 'Eres imparable!';
      return 'Modo bestia activado!';
    }
    return '';
  };

  // ==================== DISTANCE SELECTION ====================
  if (!selectedDistance) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Carrera Rapida</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.distanceContent}>
          <View style={styles.distanceHeader}>
            <Ionicons name="fitness" size={48} color={COLORS.primary} />
            <Text style={styles.distanceTitle}>Elige tu distancia</Text>
            <Text style={styles.distanceSubtitle}>Selecciona la distancia que quieres correr hoy</Text>
          </View>

          <View style={styles.distanceOptions}>
            {DISTANCES.map((d) => (
              <TouchableOpacity
                key={d.km}
                style={styles.distanceCard}
                onPress={() => setSelectedDistance(d.km)}
                activeOpacity={0.7}
              >
                <View style={styles.distanceCardIcon}>
                  <Ionicons name={d.icon as any} size={28} color={COLORS.primary} />
                </View>
                <Text style={styles.distanceKm}>{d.label}</Text>
                <Text style={styles.distanceEstimate}>{d.estimatedMinutes}</Text>
                <View style={styles.distanceArrow}>
                  <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.tipCard}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.accent} />
            <Text style={styles.tipText}>
              Recuerda calentar 5 minutos antes de empezar y estirar al terminar
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== TIMER SCREEN ====================
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => {
            if (timerStatus === 'running') {
              pauseTimer();
            }
            if (timerStatus === 'idle' || timerStatus === 'finished') {
              setSelectedDistance(null);
              resetTimer();
            } else {
              resetTimer();
              setSelectedDistance(null);
            }
          }}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carrera {selectedDistance} km</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.timerContent}>
        {/* Distance badge */}
        <View style={styles.distanceBadge}>
          <Ionicons name="navigate" size={18} color={COLORS.textWhite} />
          <Text style={styles.distanceBadgeText}>{selectedDistance} km</Text>
        </View>

        {/* Timer display */}
        <View style={styles.timerDisplay}>
          <Text style={[
            styles.timerText,
            timerStatus === 'running' && styles.timerTextActive,
            timerStatus === 'finished' && styles.timerTextFinished,
          ]}>
            {formatTime(elapsedMs)}
          </Text>
        </View>

        {/* Motivational message */}
        {getMotivationalMessage() ? (
          <Text style={styles.motivationText}>{getMotivationalMessage()}</Text>
        ) : null}

        {/* Stats */}
        {(timerStatus === 'running' || timerStatus === 'paused' || timerStatus === 'finished') && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Ritmo</Text>
              <Text style={styles.statValue}>{getPace()}</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Distancia</Text>
              <Text style={styles.statValue}>{selectedDistance} km</Text>
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {timerStatus === 'idle' && (
            <TouchableOpacity style={styles.startButton} onPress={startTimer}>
              <Ionicons name="play" size={36} color={COLORS.textWhite} />
              <Text style={styles.startButtonText}>Empezar</Text>
            </TouchableOpacity>
          )}

          {timerStatus === 'running' && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.pauseButton} onPress={pauseTimer}>
                <Ionicons name="pause" size={32} color={COLORS.textWhite} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishButton} onPress={stopTimer}>
                <Ionicons name="flag" size={28} color={COLORS.textWhite} />
                <Text style={styles.finishButtonText}>Terminar</Text>
              </TouchableOpacity>
            </View>
          )}

          {timerStatus === 'paused' && (
            <View style={styles.runningControls}>
              <TouchableOpacity style={styles.resumeButton} onPress={startTimer}>
                <Ionicons name="play" size={32} color={COLORS.textWhite} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.finishButton} onPress={stopTimer}>
                <Ionicons name="flag" size={28} color={COLORS.textWhite} />
                <Text style={styles.finishButtonText}>Terminar</Text>
              </TouchableOpacity>
            </View>
          )}

          {timerStatus === 'finished' && (
            <View style={styles.finishedControls}>
              <View style={styles.finishedCard}>
                <Ionicons name="trophy" size={40} color={COLORS.accent} />
                <Text style={styles.finishedTitle}>Carrera completada!</Text>
                <Text style={styles.finishedTime}>{formatTime(elapsedMs)}</Text>
                <Text style={styles.finishedPace}>Ritmo medio: {getPace()}</Text>
              </View>

              <View style={styles.finishedButtons}>
                <TouchableOpacity
                  style={styles.againButton}
                  onPress={() => {
                    resetTimer();
                  }}
                >
                  <Ionicons name="refresh" size={22} color={COLORS.primary} />
                  <Text style={styles.againButtonText}>Repetir</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeDist}
                  onPress={() => {
                    resetTimer();
                    setSelectedDistance(null);
                  }}
                >
                  <Ionicons name="swap-horizontal" size={22} color={COLORS.textSecondary} />
                  <Text style={styles.changeDistText}>Cambiar distancia</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => router.back()}
              >
                <Text style={styles.doneButtonText}>Volver</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Pulse animation indicator for running state */}
        {timerStatus === 'running' && (
          <View style={styles.runningIndicator}>
            <View style={styles.pulseOuter}>
              <View style={styles.pulseInner} />
            </View>
            <Text style={styles.runningLabel}>En carrera</Text>
          </View>
        )}

        {timerStatus === 'paused' && (
          <View style={styles.runningIndicator}>
            <View style={[styles.pulseOuter, { backgroundColor: `${COLORS.warning}30` }]}>
              <View style={[styles.pulseInner, { backgroundColor: COLORS.warning }]} />
            </View>
            <Text style={styles.runningLabel}>En pausa</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  placeholder: { width: 44 },

  // Distance selection screen
  distanceContent: { flex: 1, padding: SPACING.lg },
  distanceHeader: { alignItems: 'center', marginBottom: SPACING.xl },
  distanceTitle: {
    fontSize: FONTS.sizes.xxl, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, marginTop: SPACING.md
  },
  distanceSubtitle: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary,
    marginTop: SPACING.xs, textAlign: 'center'
  },
  distanceOptions: { gap: SPACING.md },
  distanceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2
  },
  distanceCardIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: `${COLORS.primary}12`, justifyContent: 'center',
    alignItems: 'center', marginRight: SPACING.md
  },
  distanceKm: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, flex: 1
  },
  distanceEstimate: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginRight: SPACING.sm
  },
  distanceArrow: {},
  tipCard: {
    flexDirection: 'row', backgroundColor: '#FFF8F0', borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md, marginTop: SPACING.xl
  },
  tipText: {
    flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary,
    marginLeft: SPACING.sm, lineHeight: 20
  },

  // Timer screen
  timerContent: { flex: 1, alignItems: 'center', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md },
  distanceBadge: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    gap: SPACING.xs
  },
  distanceBadgeText: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textWhite
  },
  timerDisplay: {
    marginVertical: SPACING.xl, alignItems: 'center'
  },
  timerText: {
    fontSize: 56, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: 2
  },
  timerTextActive: { color: COLORS.primary },
  timerTextFinished: { color: COLORS.success },
  motivationText: {
    fontSize: FONTS.sizes.md, color: COLORS.accent,
    fontWeight: FONTS.weights.semibold, marginBottom: SPACING.lg, textAlign: 'center'
  },
  statsRow: {
    flexDirection: 'row', backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.lg, padding: SPACING.md, width: '100%',
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, marginBottom: SPACING.xl
  },
  statItem: { flex: 1, alignItems: 'center' },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginBottom: 2 },
  statValue: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary },
  statDivider: { width: 1, backgroundColor: COLORS.border },

  // Controls
  controls: { width: '100%', alignItems: 'center' },
  startButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xxl,
    gap: SPACING.sm, width: '80%',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4
  },
  startButtonText: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textWhite
  },
  runningControls: {
    flexDirection: 'row', gap: SPACING.lg, alignItems: 'center'
  },
  pauseButton: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.warning,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.warning, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3
  },
  resumeButton: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3
  },
  finishButton: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.full, paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl, gap: SPACING.xs,
    shadowColor: COLORS.error, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3
  },
  finishButtonText: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textWhite
  },

  // Finished state
  finishedControls: { width: '100%', alignItems: 'center' },
  finishedCard: {
    backgroundColor: COLORS.cardBackground, borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl, alignItems: 'center', width: '100%', marginBottom: SPACING.lg,
    shadowColor: COLORS.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3
  },
  finishedTitle: {
    fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary, marginTop: SPACING.sm
  },
  finishedTime: {
    fontSize: FONTS.sizes.xxxl, fontWeight: FONTS.weights.bold,
    color: COLORS.primary, marginTop: SPACING.xs
  },
  finishedPace: {
    fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginTop: SPACING.xs
  },
  finishedButtons: {
    flexDirection: 'row', gap: SPACING.md, width: '100%', marginBottom: SPACING.md
  },
  againButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${COLORS.primary}15`, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, gap: SPACING.xs
  },
  againButtonText: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.semibold, color: COLORS.primary
  },
  changeDist: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.backgroundDark, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, gap: SPACING.xs
  },
  changeDistText: {
    fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.medium, color: COLORS.textSecondary
  },
  doneButton: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, width: '100%',
    alignItems: 'center'
  },
  doneButtonText: {
    fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textWhite
  },

  // Running indicator
  runningIndicator: {
    flexDirection: 'row', alignItems: 'center', marginTop: SPACING.xl, gap: SPACING.sm
  },
  pulseOuter: {
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: `${COLORS.success}30`, justifyContent: 'center', alignItems: 'center'
  },
  pulseInner: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success
  },
  runningLabel: {
    fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: FONTS.weights.medium
  }
});
