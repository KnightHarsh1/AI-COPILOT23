import api from './api';

export const authService = {
  login: async (credentials) => api.post('/auth/login', credentials),
  register: async (userData) => api.post('/auth/register', userData),
  forgotPassword: async (payload) => api.post('/auth/forgot-password', payload),
  getCurrentUser: async () => api.get('/auth/me'),
  updateProfile: async (payload) => api.patch('/auth/profile', payload),
  changePassword: async (payload) => api.post('/auth/change-password', payload),
  updatePreferences: async (payload) => api.patch('/auth/preferences', payload),
};
