import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from './useSocket.js';
import { STATUSES } from '../constants/statuses.js';

/**
 * Custom hook for active responders to broadcast live GPS location during an incident.
 *
 * Rules:
 * - Active only when incident is ACCEPTED or IN_PROGRESS.
 * - Throttled: sends location updates at most once every ~5 to 8 seconds.
 * - Emits 'responder:location' via Socket.IO.
 * - Automatically stops sharing when the incident resolves, cancels, or unmounts.
 */
export const useResponderLocation = (incidentId, incidentStatus) => {
  const { socket, isConnected } = useSocket();
  const [isSharing, setIsSharing] = useState(false);
  const [lastSharedAt, setLastSharedAt] = useState(null);
  const [error, setError] = useState(null);

  const watchIdRef = useRef(null);
  const lastEmitTimeRef = useRef(0);
  const THROTTLE_MS = 6000; // 6 seconds

  const isActiveStatus =
    incidentStatus === STATUSES.ACCEPTED || incidentStatus === STATUSES.IN_PROGRESS;

  const emitLocation = useCallback(
    (lat, lng) => {
      const now = Date.now();
      if (now - lastEmitTimeRef.current < THROTTLE_MS) {
        return; // Throttled
      }

      if (socket && isConnected && incidentId) {
        socket.emit('responder:location', {
          incidentId,
          lat: Number(lat),
          lng: Number(lng),
        });
        lastEmitTimeRef.current = now;
        setLastSharedAt(new Date());
        setError(null);
      }
    },
    [socket, isConnected, incidentId]
  );

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation not supported on this device');
      return;
    }

    setIsSharing(true);

    // Initial immediate capture
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        emitLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );

    // Continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        emitLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setError(`Watch error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      }
    );
  }, [emitLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsSharing(false);
  }, []);

  // Automatically start tracking when incident is in active state; stop when closed
  useEffect(() => {
    if (isActiveStatus && isConnected && incidentId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActiveStatus, isConnected, incidentId, startTracking, stopTracking]);

  return {
    isSharing,
    lastSharedAt,
    error,
    startTracking,
    stopTracking,
  };
};

export default useResponderLocation;
