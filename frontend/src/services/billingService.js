import api from './api';

const BillingService = {
  getStatus: async () => (await api.get('/billing/status')).data,
  createOrder: async (plan) => (await api.post('/billing/order', { plan })).data,
  activate: async (plan, payment_id, signature) =>
    (await api.post('/billing/activate', { plan, payment_id, signature })).data,
};

export default BillingService;
