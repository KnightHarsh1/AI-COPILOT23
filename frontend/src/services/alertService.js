import api from './api';

const AlertService = {
  getAlerts: async (status, severity) => {
    const params = {};
    if (status) params.status = status;
    if (severity) params.severity = severity;

    const response = await api.get('/alerts', { params });
    return response.data.alerts;
  },

  generateAlerts: async (status, severity) => {
    const params = {};
    if (status) params.status = status;
    if (severity) params.severity = severity;

    const response = await api.post('/alerts/generate', null, { params });
    return response.data.alerts;
  },
};

export default AlertService;
