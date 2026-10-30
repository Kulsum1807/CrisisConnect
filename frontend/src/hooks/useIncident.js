import { useState, useEffect, useCallback } from 'react';
import incidentService from '../services/incidentService.js';
import { getErrorMessage } from '../services/api.js';
import { useSocket, useSocketEvent, useIncidentRoom } from './useSocket.js';

export const useIncident = (id) => {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { reconnectCount } = useSocket();

  const fetchIncident = useCallback(async (isBackground = false) => {
    if (!id) return;
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await incidentService.getIncident(id);
      setIncident(data);
    } catch (err) {
      if (!isBackground) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    fetchIncident(false);
  }, [fetchIncident]);

  // Join incident socket room automatically
  useIncidentRoom(id);

  // Live real-time update handler
  useSocketEvent('incident:updated', (payload) => {
    if (payload?.incidentId === id) {
      setIncident((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: payload.status,
          severity: payload.severity || prev.severity,
          assignedResponder: payload.assignedResponder || prev.assignedResponder,
        };
      });
      // Fetch ground truth in background
      fetchIncident(true);
    }
  });

  // Re-fetch via REST on reconnect to restore ground truth
  useEffect(() => {
    if (reconnectCount > 0 && id) {
      fetchIncident(true);
    }
  }, [reconnectCount, id, fetchIncident]);

  const updateStatus = async (status, note = '') => {
    try {
      const updated = await incidentService.updateStatus(id, status, note);
      setIncident(updated);
      return updated;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const cancelIncident = async (reason) => {
    try {
      const updated = await incidentService.cancelIncident(id, reason);
      setIncident(updated);
      return updated;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  const reportResponder = async (reason = '') => {
    try {
      const updated = await incidentService.reportResponder(id, reason);
      setIncident(updated);
      return updated;
    } catch (err) {
      throw new Error(getErrorMessage(err));
    }
  };

  return {
    incident,
    loading,
    error,
    refresh: () => fetchIncident(false),
    updateStatus,
    cancelIncident,
    reportResponder,
  };
};

export default useIncident;
