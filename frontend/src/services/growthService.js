import api from './api';

const GrowthService = {
  getCoverage: async () => (await api.get('/growth/coverage')).data,
  getGoals: async () => (await api.get('/growth/goals')).data,
  upsertGoal: async (payload) => (await api.post('/growth/goals', payload)).data,
  getBenchmark: async () => (await api.get('/growth/benchmark')).data,
  getTimeline: async () => (await api.get('/growth/timeline')).data,
  getWeeklySummary: async () => (await api.get('/growth/weekly-summary')).data,
  explain: async (metric) => (await api.get(`/growth/explain/${metric}`)).data,
  getTeam: async () => (await api.get('/growth/team')).data,
  inviteMember: async (payload) => (await api.post('/growth/team', payload)).data,
  removeMember: async (id) => (await api.delete(`/growth/team/${id}`)).data,
  loadDemoData: async () => (await api.post('/growth/demo-data')).data,
  getProactiveBrief: async () => (await api.get('/growth/proactive-brief')).data,
  getScoreChange: async () => (await api.get('/growth/score-change')).data,
  ask: async (question) => (await api.post('/growth/ask', { question })).data,
  sendDigest: async () => (await api.post('/growth/send-digest')).data,
  runChecks: async () => (await api.post('/growth/run-checks')).data,
  updatePhone: async (phone) => (await api.patch('/growth/notification-phone', { phone })).data,
  getNotifications: async () => (await api.get('/growth/notifications')).data,
  exportData: async () => (await api.get('/growth/export')).data,
  deleteAccountData: async () => (await api.delete('/growth/account')).data,
};

export default GrowthService;
