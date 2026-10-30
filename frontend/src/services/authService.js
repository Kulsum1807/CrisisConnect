import api from './api.js';

export const authService = {
  async register(data) {
    const res = await api.post('/auth/register', data);
    return res.data.data;
  },

  async registerResponder(data) {
    const res = await api.post('/auth/register-responder', data);
    return res.data.data;
  },

  async login(credentials) {
    const res = await api.post('/auth/login', credentials);
    return res.data.data;
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  },

  async logout() {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  async updateProfile(updates) {
    const res = await api.patch('/users/me', updates);
    return res.data.data.user;
  },

  async changePassword(passwords) {
    const res = await api.patch('/users/me/password', passwords);
    return res.data;
  },
};

export default authService;
