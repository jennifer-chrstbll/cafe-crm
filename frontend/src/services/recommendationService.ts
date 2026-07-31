import api from './api';

export interface RecommendationItem {
  menu_id: string;
  name: string;
  category: string;
  price: number;
  score: number;
  reason: string;
}

export interface RecommendationResponse {
  customer_id: string;
  strategy: 'COLLABORATIVE_FILTERING' | 'COLD_START_POPULARITY';
  transaction_count: number;
  recommendations_count: number;
  recommendations: RecommendationItem[];
}

export const recommendationService = {
  getPersonalizedRecommendations: async (customerId: string, topN: number = 3): Promise<RecommendationResponse> => {
    const response = await api.get<RecommendationResponse>(`/recommendation/${customerId}?top_n=${topN}`);
    return response.data;
  },
};
