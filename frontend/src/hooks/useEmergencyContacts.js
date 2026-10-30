import { useState, useEffect, useCallback } from 'react';
import contactService from '../services/contactService.js';
import { getErrorMessage } from '../services/api.js';

export const useEmergencyContacts = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await contactService.getContacts();
      setContacts(data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const addContact = async (contactData) => {
    try {
      const newContact = await contactService.addContact(contactData);
      await fetchContacts();
      return newContact;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const updateContact = async (contactId, updates) => {
    try {
      const updated = await contactService.updateContact(contactId, updates);
      await fetchContacts();
      return updated;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const deleteContact = async (contactId) => {
    try {
      await contactService.deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c._id !== contactId));
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const primaryContact = contacts.find((c) => c.isPrimary) || null;
  const canAddMore = contacts.length < 5;

  return {
    contacts,
    loading,
    error,
    primaryContact,
    canAddMore,
    refreshContacts: fetchContacts,
    addContact,
    updateContact,
    deleteContact,
  };
};

export default useEmergencyContacts;
