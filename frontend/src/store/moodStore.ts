import { create } from 'zustand';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.backendUrl || process.env.EXPO_PUBLIC_BACKEND_URL || '';

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

interface MoodProfile {
  current_mood: string;
  mood_label: string;
  percentages: Record<string, number>;
  traveler_type: string;
}

interface DailyQuote {
  quote: string;
  author: string;
}

interface RecommendationResult {
  ai_message: string;
  quick_routine: string;
  experiences: Experience[];
  mood_profile: MoodProfile;
  daily_quote?: DailyQuote;
}

interface MoodEntry {
  id: string;
  mood: string;
  mood_label: string;
  intensity: number;
  timestamp: string;
}

interface EmotionalProfile {
  dominant_mood: string | null;
  mood_percentages: Record<string, number>;
  traveler_type: string;
  total_entries: number;
}

interface MoodState {
  currentRecommendation: RecommendationResult | null;
  moodHistory: MoodEntry[];
  emotionalProfile: EmotionalProfile | null;
  savedExperiences: Experience[];
  allExperiences: Experience[];
  isLoading: boolean;
  analyzeMood: (mood: string, intensity: number, token: string) => Promise<RecommendationResult>;
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

  analyzeMood: async (mood: string, intensity: number, token: string) => {
    set({ isLoading: true });
    try {
      const response = await axios.post(
        `${API_URL}/api/mood/analyze`,
        { mood, intensity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const result = response.data;
      set({ currentRecommendation: result, isLoading: false });
      return result;
    } catch (error: any) {
      set({ isLoading: false });
      throw new Error(error.response?.data?.detail || 'Error al analizar estado de ánimo');
    }
  },

  loadMoodHistory: async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/mood/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ moodHistory: response.data });
    } catch (error) {
      console.error('Error loading mood history:', error);
    }
  },

  loadEmotionalProfile: async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/mood/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ emotionalProfile: response.data });
    } catch (error) {
      console.error('Error loading emotional profile:', error);
    }
  },

  loadSavedExperiences: async (token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/saved`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ savedExperiences: response.data });
    } catch (error) {
      console.error('Error loading saved experiences:', error);
    }
  },

  loadAllExperiences: async () => {
    try {
      const response = await axios.get(`${API_URL}/api/experiences`);
      set({ allExperiences: response.data });
    } catch (error) {
      console.error('Error loading experiences:', error);
    }
  },

  saveExperience: async (experienceId: string, token: string) => {
    try {
      await axios.post(
        `${API_URL}/api/saved/${experienceId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await get().loadSavedExperiences(token);
    } catch (error) {
      console.error('Error saving experience:', error);
    }
  },

  unsaveExperience: async (experienceId: string, token: string) => {
    try {
      await axios.delete(`${API_URL}/api/saved/${experienceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await get().loadSavedExperiences(token);
    } catch (error) {
      console.error('Error unsaving experience:', error);
    }
  },

  checkSaved: async (experienceId: string, token: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/saved/check/${experienceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.saved;
    } catch (error) {
      return false;
    }
  },

  clearRecommendation: () => {
    set({ currentRecommendation: null });
  }
}));
