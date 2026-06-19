import api from './api';

const CommandCenterService = {
  getCommandCenter: async () => {
    const response = await api.get('/command-center');
    return response.data;
  },

  updateComplianceProfile: async (payload) => {
    const response = await api.patch('/command-center/compliance-profile', payload);
    return response.data;
  },
};

export default CommandCenterService;
