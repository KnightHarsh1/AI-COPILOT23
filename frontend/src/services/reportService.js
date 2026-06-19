import api from './api';

const ReportService = {
  getReports: async (reportType) => {
    const params = {};
    if (reportType) {
      params.report_type = reportType;
    }
    const response = await api.get('/reports', { params });
    return response.data.reports;
  },

  getReport: async (reportId) => {
    const response = await api.get(`/reports/${reportId}`);
    return response.data;
  },

  generateReport: async (reportType, startDate, endDate) => {
    const response = await api.post('/reports/generate', {
      report_type: reportType,
      start_date: startDate,
      end_date: endDate,
    });
    return response.data;
  },

  getExecutiveReport: async () => {
    const response = await api.get('/reports/executive');
    return response.data;
  },
};

export default ReportService;
