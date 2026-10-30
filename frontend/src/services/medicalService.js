import api from './api.js';

/**
 * Service for managing private medical data.
 */
export const medicalService = {
  /**
   * Fetch authenticated user's private medical info.
   */
  async getMyMedicalInfo() {
    const res = await api.get('/users/me/medical-info');
    return res.data.data?.medicalInfo ?? null;
  },

  /**
   * Replace authenticated user's medical info.
   */
  async updateMyMedicalInfo(data) {
    const res = await api.put('/users/me/medical-info', data);
    return res.data.data?.medicalInfo ?? null;
  },

  /**
   * Remove all medical info for authenticated user.
   */
  async deleteMyMedicalInfo() {
    const res = await api.delete('/users/me/medical-info');
    return res.data;
  },

  /**
   * Retrieve incident creator's medical info (responder only; active incident).
   */
  async getIncidentMedicalInfo(incidentId) {
    const res = await api.get(`/incidents/${incidentId}/medical-info`);
    return res.data.data?.medicalInfo ?? null;
  },
};

export default medicalService;
