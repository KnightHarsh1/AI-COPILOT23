import api from './api';

const DashboardBriefService = {
  getBrief: async () => {
    const response = await api.get('/dashboard-brief/');
    return response.data;
  },
};

export default DashboardBriefService;
