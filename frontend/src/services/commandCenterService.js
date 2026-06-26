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

  getBankingLiquidity: async () => {
    const response = await api.get('/banking-liquidity');
    return response.data;
  },

  getLiquidityReport: async () => {
    const response = await api.get('/banking-liquidity/report');
    return response.data;
  },

  getWorkingCapital: async () => (await api.get('/intelligence/working-capital')).data,
  getForecasting: async () => (await api.get('/intelligence/forecasting')).data,
  getRiskIntelligence: async () => (await api.get('/intelligence/risk')).data,
  getExecutiveIntelligence: async () => (await api.get('/intelligence/executive')).data,
  getGstReconciliation: async () => (await api.get('/intelligence/gst-reconciliation')).data,
  addPurchaseRecords: async (records) => (await api.post('/intelligence/gst-purchase', { records })).data,
};

export default CommandCenterService;
