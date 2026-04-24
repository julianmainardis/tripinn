import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/authApi';
import { User } from '../types/auth';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    name: string,
    nationality: string,
    language: string,
    city?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  login: async (email, password) => {
    try {
      const { data } = await authApi.login(email, password);
      await AsyncStorage.setItem('numa_token', data.token);
      await AsyncStorage.setItem('numa_user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  },
  register: async (email, password, name, nationality, language, city) => {
    try {
      const { data } = await authApi.register({
        email,
        password,
        name,
        nationality,
        language,
        city: city || 'Tu ciudad',
      });
      await AsyncStorage.setItem('numa_token', data.token);
      await AsyncStorage.setItem('numa_user', JSON.stringify(data.user));
      set({ token: data.token, user: data.user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al registrarse');
    }
  },
  logout: async () => {
    await AsyncStorage.removeItem('numa_token');
    await AsyncStorage.removeItem('numa_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
  loadUser: async () => {
    try {
      const token = await AsyncStorage.getItem('numa_token');
      const userStr = await AsyncStorage.getItem('numa_user');
      if (token && userStr) {
        const { data } = await authApi.profile(token);
        await AsyncStorage.setItem('numa_user', JSON.stringify(data));
        set({ token, user: data, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await AsyncStorage.removeItem('numa_token');
      await AsyncStorage.removeItem('numa_user');
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
    }
  },
  updateProfile: async (data) => {
    const { token } = get();
    if (!token) throw new Error('Sesión expirada');
    try {
      const response = await authApi.updateProfile(token, data);
      await AsyncStorage.setItem('numa_user', JSON.stringify(response.data));
      set({ user: response.data });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al actualizar perfil');
    }
  },
}));
