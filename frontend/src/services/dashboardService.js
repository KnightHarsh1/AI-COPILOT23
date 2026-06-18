import api from './api';

const DashboardService = {
  getSummary: async () => {
    const response = await api.get('/dashboard/');
    return response.data;
  },
};

export default DashboardService;
