import api from './api';

export const uploadService = {
  uploadFile: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },

  getHistory: async () => {
    const response = await api.get('/upload/history');
    return response.data;
  },

  deleteFile: async (fileId) => {
    const response = await api.delete(`/upload/${fileId}`);
    return response.data;
  },

  getAnalytics: async () => {
    const response = await api.get('/upload/analytics');
    return response.data;
  },
};
