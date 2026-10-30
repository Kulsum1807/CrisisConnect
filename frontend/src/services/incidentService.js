import api from './api.js';

export const incidentService = {
  async createIncident(incidentData) {
    const res = await api.post('/incidents', incidentData);
    return res.data.data.incident;
  },

  async getIncident(id) {
    const res = await api.get(`/incidents/${id}`);
    return res.data.data.incident;
  },

  async listIncidents(params = {}) {
    const res = await api.get('/incidents', { params });
    return res.data.data;
  },

  async updateStatus(id, status, note = '') {
    const res = await api.patch(`/incidents/${id}/status`, { status, note });
    return res.data.data.incident;
  },

  async cancelIncident(id, reason) {
    const res = await api.post(`/incidents/${id}/cancel`, { reason });
    return res.data.data.incident;
  },

  async assignResponder(id, responderId) {
    const res = await api.post(`/incidents/${id}/assign`, { responderId });
    return res.data.data.incident;
  },

  async overrideSeverity(id, severity, reason) {
    const res = await api.patch(`/incidents/${id}/severity`, { severity, reason });
    return res.data.data.incident;
  },

  async reportResponder(id, reason = '') {
    const res = await api.post(`/incidents/${id}/report-responder`, { reason });
    return res.data.data.incident;
  },
};

export default incidentService;
