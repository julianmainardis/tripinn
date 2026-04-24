import axios from 'axios';
import Constants from 'expo-constants';

export const API_URL =
  Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

export function authHeaders(token?: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
