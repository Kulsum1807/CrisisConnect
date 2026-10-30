import api from './api.js';

export const adminService = {
  async getUsers(params = {}) {
    const res = await api.get('/admin/users', { params });
    return res.data.data;
  },

  async getResponders(params = {}) {
    const res = await api.get('/admin/responders', { params });
    return res.data.data;
  },

  async verifyResponder(id, status, note = '') {
    const res = await api.patch(`/admin/responders/${id}/verify`, { status, note });
    return res.data.data.responder;
  },

  async updateUserStatus(id, isActive, reason = '') {
    const res = await api.patch(`/admin/users/${id}/status`, { isActive, reason });
    return res.data.data.user;
  },

  async getDashboardStats() {
    const res = await api.get('/admin/dashboard');
    return res.data.data;
  },

  async getAnalytics(params = {}) {
    const res = await api.get('/admin/analytics', { params });
    return res.data.data;
  },
};

export default adminService;
