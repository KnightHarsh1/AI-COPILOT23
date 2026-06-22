import api from './api';

export const ingestionService = {
  analyze: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post('/ingestion/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      })
      .then((response) => response.data);
  },

  updateMapping: async (batchId, mapping) => {
    const response = await api.patch(`/ingestion/batches/${batchId}/mapping`, { mapping });
    return response.data;
  },

  confirm: async (batchId, payload) => {
    const response = await api.post(`/ingestion/batches/${batchId}/confirm`, payload);
    return response.data;
  },

  getBatch: async (batchId) => {
    const response = await api.get(`/ingestion/batches/${batchId}`);
    return response.data;
  },

  listMappingTemplates: async () => {
    const response = await api.get('/ingestion/mapping-templates');
    return response.data;
  },
  importHistory: async () => {
    const response = await api.get('/ingestion/history');
    return response.data;
  },
  fieldRegistry: async () => {
    const response = await api.get('/ingestion/field-registry');
    return response.data;
  },
  deleteImport: async (batchId) => {
    const response = await api.delete(`/ingestion/imports/${batchId}`);
    return response.data;
  },
  recalculate: async () => {
    const response = await api.post('/ingestion/recalculate');
    return response.data;
  },

  deleteMappingTemplate: async (templateId) => {
    const response = await api.delete(`/ingestion/mapping-templates/${templateId}`);
    return response.data;
  },
};
