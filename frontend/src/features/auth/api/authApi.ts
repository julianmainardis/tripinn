import { apiClient, authHeaders } from '../../../shared/api/http';
import { AuthResponse, User } from '../types/auth';

export const authApi = {
  login(email: string, password: string) {
    return apiClient.post<AuthResponse>('/auth/login', { email, password });
  },
  register(payload: {
    email: string;
    password: string;
    name: string;
    nationality: string;
    language: string;
    city?: string;
  }) {
    return apiClient.post<AuthResponse>('/auth/register', payload);
  },
  profile(token: string) {
    return apiClient.get<User>('/auth/profile', { headers: authHeaders(token) });
  },
  updateProfile(token: string, data: Partial<User>) {
    return apiClient.put<User>('/auth/profile', data, { headers: authHeaders(token) });
  },
};
