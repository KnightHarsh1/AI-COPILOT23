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

  getExpenseTrendChart: async () => {
    const response = await api.get('/charts/expense-trend');
    return response.data.data;
  },

  getRevenueVsExpenseChart: async () => {
    const response = await api.get('/charts/revenue-vs-expense');
    return response.data.data;
  },
};

export default ChartService;
