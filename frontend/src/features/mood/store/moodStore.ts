import { create } from 'zustand';
import { apiClient, authHeaders } from '../../../shared/api/http';

export interface Experience {
  id: string;
  title: string;
  description: string;
  short_description: string;
  category: string;
  tags: string[];
  image_url: string;
  duration: string;
  location: string;
  affiliate_link_placeholder: string;
  mood_tags: string[];
  is_express?: boolean;
  is_home_activity?: boolean;
  is_travel?: boolean;
}
interface MoodState {
  currentRecommendation: any;
  moodHistory: any[];
  emotionalProfile: any;
  savedExperiences: Experience[];
  allExperiences: Experience[];
  isLoading: boolean;
  analyzeMood: (mood: string, intensity: number, token: string) => Promise<any>;
  loadMoodHistory: (token: string) => Promise<void>;
  loadEmotionalProfile: (token: string) => Promise<void>;
  loadSavedExperiences: (token: string) => Promise<void>;
  loadAllExperiences: () => Promise<void>;
  saveExperience: (experienceId: string, token: string) => Promise<void>;
  unsaveExperience: (experienceId: string, token: string) => Promise<void>;
  checkSaved: (experienceId: string, token: string) => Promise<boolean>;
  clearRecommendation: () => void;
}

export const useMoodStore = create<MoodState>((set, get) => ({
  currentRecommendation: null,
  moodHistory: [],
  emotionalProfile: null,
  savedExperiences: [],
  allExperiences: [],
  isLoading: false,
  analyzeMood: async (mood, intensity, token) => {
    set({ isLoading: true });
    try {
      const response = await apiClient.post('/mood/analyze', { mood, intensity }, { headers: authHeaders(token) });
      set({ currentRecommendation: response.data, isLoading: false });
      return response.data;
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.detail || 'Error al analizar estado de ánimo');
    }
  },
  loadMoodHistory: async (token) => {
    const response = await apiClient.get('/mood/history', { headers: authHeaders(token) });
    set({ moodHistory: response.data });
  },
  loadEmotionalProfile: async (token) => {
    const response = await apiClient.get('/mood/profile', { headers: authHeaders(token) });
    set({ emotionalProfile: response.data });
  },
  loadSavedExperiences: async (token) => {
    const response = await apiClient.get('/saved', { headers: authHeaders(token) });
    set({ savedExperiences: response.data });
  },
  loadAllExperiences: async () => {
    const response = await apiClient.get('/experiences');
    set({ allExperiences: response.data });
  },
  saveExperience: async (experienceId, token) => {
    await apiClient.post(`/saved/${experienceId}`, {}, { headers: authHeaders(token) });
    await get().loadSavedExperiences(token);
  },
  unsaveExperience: async (experienceId, token) => {
    await apiClient.delete(`/saved/${experienceId}`, { headers: authHeaders(token) });
    await get().loadSavedExperiences(token);
  },
  checkSaved: async (experienceId, token) => {
    const response = await apiClient.get(`/saved/check/${experienceId}`, { headers: authHeaders(token) });
    return response.data.saved;
  },
  clearRecommendation: () => set({ currentRecommendation: null }),
}));
