import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to interface with the browser's Geolocation API.
 * Supports both one-time location capture and continuous watch with permission state tracking.
 * Fail-safe: Handles location denial, timeouts, and unencrypted HTTP contexts gracefully.
 */
export const useGeolocation = (options = {}) => {
  const [coords, setCoords] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('prompt'); // 'prompt' | 'granted' | 'denied' | 'unavailable'

  const watchIdRef = useRef(null);

  const defaultOptions = {
    enableHighAccuracy: true,
    timeout: 8000,
    maximumAge: 10000,
    ...options,
  };

  // Inspect navigator.permissions if supported
  useEffect(() => {
    if ('permissions' in navigator && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((status) => {
          setPermission(status.state);
          status.onchange = () => setPermission(status.state);
        })
        .catch(() => {
          // Permissions API query not supported for geolocation on all browsers
        });
    } else if (!('geolocation' in navigator)) {
      setPermission('unavailable');
    }
  }, []);

  /**
   * One-time capture of current coordinates.
   * Returns a promise resolving to { lat, lng, accuracy } or null on failure.
   */
  const getCurrentLocation = useCallback(
    (customOptions = {}) => {
      return new Promise((resolve) => {
        if (!('geolocation' in navigator)) {
          setPermission('unavailable');
          setError('Geolocation is not supported by your browser');
          resolve(null);
          return;
        }

        setLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const result = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy,
            };
            setCoords(result);
            setPermission('granted');
            setLoading(false);
            resolve(result);
          },
          (err) => {
            let errorMsg = 'Failed to retrieve location';
            if (err.code === 1) {
              setPermission('denied');
              errorMsg = 'Location permission denied. You can manually enter your address.';
            } else if (err.code === 2) {
              setPermission('unavailable');
              errorMsg = 'Location unavailable. Please verify GPS/location settings.';
            } else if (err.code === 3) {
              errorMsg = 'Location request timed out. Please try again.';
            }
            setError(errorMsg);
            setLoading(false);
            resolve(null);
          },
          { ...defaultOptions, ...customOptions }
        );
      });
    },
    [defaultOptions]
  );

  /**
   * Start watching user position continuously.
   */
  const startWatch = useCallback(
    (onLocationUpdate = null, customOptions = {}) => {
      if (!('geolocation' in navigator)) {
        setPermission('unavailable');
        return;
      }

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const result = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setCoords(result);
          setPermission('granted');
          if (onLocationUpdate) {
            onLocationUpdate(result);
          }
        },
        (err) => {
          if (err.code === 1) setPermission('denied');
          setError(err.message || 'Error watching position');
        },
        { ...defaultOptions, ...customOptions }
      );
    },
    [defaultOptions]
  );

  /**
   * Stop watching user position.
   */
  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  // Cleanup watch on unmount
  useEffect(() => {
    return () => {
      stopWatch();
    };
  }, [stopWatch]);

  return {
    coords,
    loading,
    error,
    permission,
    isAvailable: 'geolocation' in navigator,
    getCurrentLocation,
    startWatch,
    stopWatch,
  };
};

export default useGeolocation;
