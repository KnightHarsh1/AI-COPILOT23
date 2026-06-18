import api from './api';

const KPIService = {
  // No date range is sent by default — the backend applies a consistent
  // trailing-30-day window used everywhere else in the app (health score,
  // alerts, recommendations, AI brief) so every screen agrees with itself.
  calculateKPIs: async (startDate, endDate) => {
    const payload = {};
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;

    const response = await api.post('/kpis/calculate', payload);
    return response.data;
  },
};

export default KPIService;
