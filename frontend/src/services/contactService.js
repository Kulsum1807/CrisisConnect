import api from './api.js';

export const contactService = {
  async getContacts() {
    const res = await api.get('/users/me/emergency-contacts');
    return res.data.data.contacts;
  },

  async addContact(contactData) {
    const res = await api.post('/users/me/emergency-contacts', contactData);
    return res.data.data.contact;
  },

  async updateContact(contactId, updates) {
    const res = await api.patch(`/users/me/emergency-contacts/${contactId}`, updates);
    return res.data.data.contact;
  },

  async deleteContact(contactId) {
    const res = await api.delete(`/users/me/emergency-contacts/${contactId}`);
    return res.data;
  },
};

export default contactService;
