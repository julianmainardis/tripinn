import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/authStore';
import { Button } from '../src/components/Button';
import { COLORS, FONTS, SPACING } from '../src/constants/theme';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/(tabs)');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingLogo}>InnerGo</Text>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: 'https://images.unsplash.com/photo-1707249935951-d92bf3a65b00' }}
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>InnerGo</Text>
          <Text style={styles.tagline}>Tu guía hacia el bienestar</Text>
        </View>
        
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            Encuentra tu{"\n"}próxima experiencia
          </Text>
          <Text style={styles.heroSubtitle}>
            Recomendaciones personalizadas{"\n"}según cómo te sientes hoy
          </Text>
        </View>
        
        <View style={styles.buttonContainer}>
          <Button
            title="Comenzar"
            onPress={() => router.push('/register')}
            size="large"
            style={styles.primaryButton}
            textStyle={styles.primaryButtonText}
          />
          <Button
            title="Ya tengo cuenta"
            onPress={() => router.push('/login')}
            variant="outline"
            size="large"
            style={styles.secondaryButton}
            textStyle={styles.secondaryButtonText}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background
  },
  loadingLogo: {
    fontSize: 36,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginBottom: SPACING.md
  },
  loadingText: {
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary
  },
  backgroundImage: {
    position: 'absolute',
    width: width,
    height: height
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)'
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: SPACING.lg
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.xl
  },
  logo: {
    fontSize: 52,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    letterSpacing: 2
  },
  tagline: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textWhite,
    opacity: 0.9,
    marginTop: SPACING.xs
  },
  heroSection: {
    alignItems: 'center'
  },
  heroTitle: {
    fontSize: FONTS.sizes.xxxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textWhite,
    textAlign: 'center',
    lineHeight: 48
  },
  heroSubtitle: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textWhite,
    textAlign: 'center',
    opacity: 0.9,
    marginTop: SPACING.md,
    lineHeight: 24
  },
  buttonContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl
  },
  primaryButton: {
    backgroundColor: COLORS.textWhite
  },
  primaryButtonText: {
    color: COLORS.primary
  },
  secondaryButton: {
    borderColor: COLORS.textWhite
  },
  secondaryButtonText: {
    color: COLORS.textWhite
  }
});
