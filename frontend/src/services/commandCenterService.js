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

  updateBusinessProfile: async (payload) => {
    const response = await api.patch('/command-center/business-profile', payload);
    return response.data;
  },

  getFreshness: async () => {
    const response = await api.get('/command-center/freshness');
    return response.data;
  },

  dismissMarketInsight: async (id) => {
    const response = await api.post(`/market-radar/insights/${id}/dismiss`);
    return response.data;
  },

  actOnMarketInsight: async (id) => {
    const response = await api.post(`/market-radar/insights/${id}/act`);
    return response.data;
  },
};

export default CommandCenterService;
