import { apiClient, authHeaders } from '../../../shared/api/http';

export const tripsApi = {
  dailyQuote() {
    return apiClient.get('/quote/daily');
  },
  airportSearch(query: string) {
    return apiClient.get('/airports/search', { params: { query } });
  },
  searchTravel(payload: Record<string, unknown>, token: string) {
    return apiClient.post('/travel/search', payload, { headers: authHeaders(token) });
  },
  getExperience(id: string) {
    return apiClient.get(`/experiences/${id}`);
  },
};
