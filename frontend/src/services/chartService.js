import api from './api';

const ChartService = {
  getRevenueChart: async () => {
    const response = await api.get('/charts/revenue');
    return response.data.data;
  },

  getProfitChart: async () => {
    const response = await api.get('/charts/profit');
    return response.data.data;
  },

  getExpenseChart: async () => {
    const response = await api.get('/charts/expenses');
    return response.data.data;
  },

  getHealthChart: async () => {
    const response = await api.get('/charts/health');
    return response.data.data;
  },
};

export default ChartService;
