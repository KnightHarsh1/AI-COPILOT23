import api from './api';

const RecommendationService = {
  getRecommendations: async (status, recommendationType) => {
    const params = {};
    if (status) params.status = status;
    if (recommendationType) params.recommendation_type = recommendationType;
    const response = await api.get('/recommendations', { params });
    return response.data.recommendations;
  },

  generateRecommendations: async (startDate, endDate) => {
    const response = await api.post('/recommendations/generate', {
      start_date: startDate,
      end_date: endDate,
    });
    return response.data.recommendations;
  },
};

export default RecommendationService;
