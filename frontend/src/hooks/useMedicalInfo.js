import { useState, useEffect, useCallback } from 'react';
import medicalService from '../services/medicalService.js';
import { TERMINAL_STATUSES } from '../constants/statuses.js';

/**
 * Custom hook for citizen user's personal medical info management.
 */
export const useMyMedicalInfo = () => {
  const [medicalInfo, setMedicalInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchMedicalInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicalService.getMyMedicalInfo();
      setMedicalInfo(data);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to load medical information');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedicalInfo();
  }, [fetchMedicalInfo]);

  const saveMedicalInfo = async (formData) => {
    setSaving(true);
    setError(null);
    try {
      const updated = await medicalService.updateMyMedicalInfo(formData);
      setMedicalInfo(updated);
      return updated;
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to update medical information';
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const clearMedicalInfo = async () => {
    setSaving(true);
    setError(null);
    try {
      await medicalService.deleteMyMedicalInfo();
      setMedicalInfo(null);
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Failed to clear medical information';
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return {
    medicalInfo,
    loading,
    saving,
    error,
    saveMedicalInfo,
    clearMedicalInfo,
    refetch: fetchMedicalInfo,
  };
};

/**
 * Custom hook for responder incident medical info view.
 * Respects incident status: will not fetch or retain data if incident is terminal.
 */
export const useIncidentMedicalInfo = (incidentId, incidentStatus) => {
  const [medicalInfo, setMedicalInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isTerminal = !incidentStatus || TERMINAL_STATUSES.includes(incidentStatus);

  const fetchIncidentMedicalInfo = useCallback(async () => {
    if (!incidentId || isTerminal) {
      setMedicalInfo(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await medicalService.getIncidentMedicalInfo(incidentId);
      setMedicalInfo(data);
    } catch (err) {
      // 403 or errors are treated gracefully without leaking state
      setMedicalInfo(null);
      setError(err?.response?.data?.message || err.message || 'Unable to access medical information');
    } finally {
      setLoading(false);
    }
  }, [incidentId, isTerminal]);

  useEffect(() => {
    if (isTerminal) {
      setMedicalInfo(null);
      return;
    }
    fetchIncidentMedicalInfo();
  }, [incidentId, incidentStatus, isTerminal, fetchIncidentMedicalInfo]);

  return {
    medicalInfo,
    loading,
    error,
    refetch: fetchIncidentMedicalInfo,
  };
};

export default {
  useMyMedicalInfo,
  useIncidentMedicalInfo,
};
