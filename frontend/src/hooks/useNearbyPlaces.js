import { useState, useEffect, useCallback } from 'react';
import placesService from '../services/placesService.js';
import { isValidCoordinate } from '../utils/geo.js';

/**
 * Custom hook to fetch and manage nearby hospitals and police stations.
 *
 * @param {Object} options
 * @param {number|null} options.lat - Center latitude
 * @param {number|null} options.lng - Center longitude
 * @param {number} [options.radius=5000] - Search radius in metres
 * @param {'hospital'|'police'|'all'} [options.type='all'] - Type filter
 * @param {boolean} [options.enabled=true] - Whether query should execute
 */
export const useNearbyPlaces = ({
  lat,
  lng,
  radius = 5000,
  type = 'all',
  enabled = true,
}) => {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlaces = useCallback(async () => {
    if (!enabled || lat === null || lat === undefined || lng === null || lng === undefined) {
      return;
    }

    const numLat = Number(lat);
    const numLng = Number(lng);

    if (!isValidCoordinate(numLat, numLng)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await placesService.getNearbyPlaces({
        lat: numLat,
        lng: numLng,
        radius,
        type,
      });
      setPlaces(data);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Nearby emergency services directory is temporarily unavailable.';
      setError(message);
      // Keep empty array on error to prevent breaking rendering
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius, type, enabled]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  return {
    places,
    loading,
    error,
    refetch: fetchPlaces,
  };
};

export default useNearbyPlaces;
