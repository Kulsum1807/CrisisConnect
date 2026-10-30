import api from './api.js';

export const responderService = {
  async updateStatus(availability) {
    const res = await api.patch('/responders/status', { availability });
    return res.data.data;
  },

  async updateLocation(lat, lng) {
    const res = await api.patch('/responders/location', { lat, lng });
    return res.data.data;
  },

  async getIncidents(params = {}) {
    const res = await api.get('/responders/incidents', { params });
    return res.data.data;
  },

  async acceptIncident(id) {
    const res = await api.post(`/responders/incidents/${id}/accept`);
    return res.data.data.incident;
  },

  async declineIncident(id, reason = '') {
    const res = await api.post(`/responders/incidents/${id}/decline`, { reason });
    return res.data;
  },
};

export default responderService;
