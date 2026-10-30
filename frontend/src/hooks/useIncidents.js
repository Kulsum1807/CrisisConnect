import { useState, useEffect, useCallback } from 'react';
import incidentService from '../services/incidentService.js';
import { getErrorMessage } from '../services/api.js';
import { useSocket, useSocketEvent } from './useSocket.js';

export const useIncidents = (params = {}) => {
  const [incidents, setIncidents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { reconnectCount } = useSocket();

  // Stringify params for dependency tracking
  const paramKey = JSON.stringify(params);

  const fetchIncidents = useCallback(async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await incidentService.listIncidents(params);
      setIncidents(data.items || []);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages: data.totalPages,
      });
    } catch (err) {
      if (!isBackground) {
        setError(getErrorMessage(err));
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  }, [paramKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchIncidents(false);
  }, [fetchIncidents]);

  // Live real-time update: Patch matching incident in list
  useSocketEvent('incident:updated', (payload) => {
    setIncidents((prev) =>
      prev.map((inc) =>
        (inc._id || inc.incidentId) === payload.incidentId
          ? {
              ...inc,
              status: payload.status,
              severity: payload.severity || inc.severity,
              assignedResponder: payload.assignedResponder || inc.assignedResponder,
            }
          : inc
      )
    );
  });

  // Live real-time update: Remove if taken and this query is for available scope
  useSocketEvent('incident:taken', (payload) => {
    if (params?.scope === 'available') {
      setIncidents((prev) =>
        prev.filter((inc) => (inc._id || inc.incidentId) !== payload.incidentId)
      );
    }
  });

  // Re-fetch on socket reconnect
  useEffect(() => {
    if (reconnectCount > 0) {
      fetchIncidents(true);
    }
  }, [reconnectCount, fetchIncidents]);

  return {
    incidents,
    pagination,
    loading,
    error,
    refresh: () => fetchIncidents(false),
  };
};

export default useIncidents;
