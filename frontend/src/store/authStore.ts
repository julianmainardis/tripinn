import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

interface User {
  id: string;
  email: string;
  name: string;
  nationality: string;
  language: string;
  city?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, nationality: string, language: string, city?: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('numa_token', token);
      await AsyncStorage.setItem('numa_user', JSON.stringify(user));
      
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al iniciar sesión');
    }
  },

  register: async (email: string, password: string, name: string, nationality: string, language: string, city?: string) => {
    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        email,
        password,
        name,
        nationality,
        language,
        city: city || 'Tu ciudad'
      });
      const { token, user } = response.data;
      
      await AsyncStorage.setItem('numa_token', token);
      await AsyncStorage.setItem('numa_user', JSON.stringify(user));
      
      set({ token, user, isAuthenticated: true, isLoading: false });
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
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      set({ isLoading: false });
    }
  },

  updateProfile: async (data: Partial<User>) => {
    const { token } = get();
    try {
      const response = await axios.put(`${API_URL}/api/auth/profile`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updatedUser = response.data;
      
      await AsyncStorage.setItem('numa_user', JSON.stringify(updatedUser));
      set({ user: updatedUser });
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Error al actualizar perfil');
    }
  }
}));
