import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../src/store/authStore';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { NATIONALITIES, LANGUAGES } from '../src/constants/nationalities';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../src/constants/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const register = useAuthStore((state) => state.register);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nationality, setNationality] = useState('España');
  const [language, setLanguage] = useState('es');
  const [showNationalities, setShowNationalities] = useState(false);
  const [showLanguages, setShowLanguages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) newErrors.name = 'El nombre es requerido';
    if (!email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email inválido';
    }
    if (!password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (password.length < 6) {
      newErrors.password = 'Mínimo 6 caracteres';
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim(), nationality, language);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={COLORS.textPrimary}
              onPress={() => router.back()}
            />
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>Crea tu cuenta</Text>
            <Text style={styles.subtitle}>Comienza tu camino hacia el bienestar</Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Nombre"
              placeholder="Tu nombre"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              error={errors.name}
            />

            <Input
              label="Email"
              placeholder="tu@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email}
            />

            <Input
              label="Contraseña"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              error={errors.password}
            />

            <Input
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              error={errors.confirmPassword}
            />

            {/* Nationality Selector */}
            <View style={styles.selectContainer}>
              <Text style={styles.label}>País</Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setShowNationalities(!showNationalities)}
              >
                <Text style={styles.selectText}>{nationality}</Text>
                <Ionicons
                  name={showNationalities ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              {showNationalities && (
                <View style={styles.dropdown}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {NATIONALITIES.map((item) => (
                      <TouchableOpacity
                        key={item.value}
                        style={[
                          styles.dropdownItem,
                          nationality === item.value && styles.dropdownItemSelected
                        ]}
                        onPress={() => {
                          setNationality(item.value);
                          setShowNationalities(false);
                        }}
                      >
                        <Text style={[
                          styles.dropdownItemText,
                          nationality === item.value && styles.dropdownItemTextSelected
                        ]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Language Selector */}
            <View style={styles.selectContainer}>
              <Text style={styles.label}>Idioma preferido</Text>
              <TouchableOpacity
                style={styles.select}
                onPress={() => setShowLanguages(!showLanguages)}
              >
                <Text style={styles.selectText}>
                  {LANGUAGES.find(l => l.value === language)?.label || language}
                </Text>
                <Ionicons
                  name={showLanguages ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
              {showLanguages && (
                <View style={styles.dropdown}>
                  {LANGUAGES.map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={[
                        styles.dropdownItem,
                        language === item.value && styles.dropdownItemSelected
                      ]}
                      onPress={() => {
                        setLanguage(item.value);
                        setShowLanguages(false);
                      }}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        language === item.value && styles.dropdownItemTextSelected
                      ]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <Button
              title="Crear cuenta"
              onPress={handleRegister}
              loading={loading}
              size="large"
              style={styles.registerButton}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              ¿Ya tienes cuenta?{' '}
              <Text
                style={styles.footerLink}
                onPress={() => router.replace('/login')}
              >
                Inicia sesión
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  keyboardView: {
    flex: 1
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.lg
  },
  header: {
    marginBottom: SPACING.lg
  },
  titleContainer: {
    marginBottom: SPACING.xl
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
  form: {
    gap: SPACING.sm
  },
  selectContainer: {
    marginBottom: SPACING.md,
    zIndex: 1
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md
  },
  selectText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: SPACING.xs,
    zIndex: 1000,
    elevation: 5,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  dropdownScroll: {
    maxHeight: 200
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm
  },
  dropdownItemSelected: {
    backgroundColor: `${COLORS.primary}15`
  },
  dropdownItemText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textPrimary
  },
  dropdownItemTextSelected: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold
  },
  registerButton: {
    marginTop: SPACING.md
  },
  footer: {
    paddingTop: SPACING.xl,
    alignItems: 'center'
  },
  footerText: {
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary
  },
  footerLink: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.semibold
  }
});
