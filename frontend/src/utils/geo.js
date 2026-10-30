/**
 * CrisisConnect Frontend Geolocation and Map Coordinates Utility
 *
 * Golden Rules:
 * - GeoJSON standard order: [longitude, latitude]
 * - Leaflet / Client map order: [latitude, longitude] (or { lat, lng })
 */

/**
 * Validates whether latitude and longitude are within standard geographical boundaries.
 *
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lng - Longitude (-180 to 180)
 * @returns {boolean}
 */
export const isValidCoordinate = (lat, lng) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  return (
    !isNaN(numLat) &&
    !isNaN(numLng) &&
    numLat >= -90 &&
    numLat <= 90 &&
    numLng >= -180 &&
    numLng <= 180
  );
};

/**
 * Safely converts any supported coordinate input into Leaflet [latitude, longitude] format.
 * Supports:
 * - GeoJSON coordinates [lng, lat]
 * - Array [lat, lng]
 * - Object { lat, lng } or { latitude, longitude }
 * - Object with GeoJSON geometry { coordinates: [lng, lat] }
 *
 * @param {Object|Array|null} coords
 * @returns {[number, number]|null} [lat, lng]
 */
export const toLatLng = (coords) => {
  if (!coords) return null;

  // 1. Array format
  if (Array.isArray(coords) && coords.length >= 2) {
    const [first, second] = coords.map(Number);
    if (isNaN(first) || isNaN(second)) return null;

    // Disambiguation: GeoJSON is [lng, lat]. In India / global context:
    // If first is longitude (e.g. 72.8777) and second is latitude (e.g. 19.0760)
    // GeoJSON [lng, lat] -> Leaflet [lat, lng]
    if (Math.abs(first) > 90 && Math.abs(second) <= 90) {
      return [second, first];
    }
    // Standard assumption for GeoJSON points: [lng, lat] -> [lat, lng]
    return [second, first];
  }

  // 2. Object format with nested GeoJSON coordinates
  if (typeof coords === 'object') {
    if (Array.isArray(coords.coordinates) && coords.coordinates.length >= 2) {
      const [lng, lat] = coords.coordinates.map(Number);
      return isValidCoordinate(lat, lng) ? [lat, lng] : null;
    }

    if (coords.lat !== undefined && coords.lng !== undefined) {
      const lat = Number(coords.lat);
      const lng = Number(coords.lng);
      return isValidCoordinate(lat, lng) ? [lat, lng] : null;
    }

    if (coords.latitude !== undefined && coords.longitude !== undefined) {
      const lat = Number(coords.latitude);
      const lng = Number(coords.longitude);
      return isValidCoordinate(lat, lng) ? [lat, lng] : null;
    }
  }

  return null;
};

/**
 * Converts client coordinates into GeoJSON Point coordinates [longitude, latitude].
 *
 * @param {Object|Array|null} coords
 * @returns {[number, number]|null} [lng, lat]
 */
export const toGeoJSONPoint = (coords) => {
  if (!coords) return null;

  if (Array.isArray(coords) && coords.length >= 2) {
    const latLng = toLatLng(coords);
    return latLng ? [latLng[1], latLng[0]] : null;
  }

  if (typeof coords === 'object') {
    if (coords.lat !== undefined && coords.lng !== undefined) {
      const lat = Number(coords.lat);
      const lng = Number(coords.lng);
      return isValidCoordinate(lat, lng) ? [lng, lat] : null;
    }
    if (coords.latitude !== undefined && coords.longitude !== undefined) {
      const lat = Number(coords.latitude);
      const lng = Number(coords.longitude);
      return isValidCoordinate(lat, lng) ? [lng, lat] : null;
    }
    if (Array.isArray(coords.coordinates)) {
      return coords.coordinates;
    }
  }

  return null;
};

/**
 * Formats coordinates for clean, human-friendly UI display.
 * Example: "19.0760° N, 72.8777° E"
 *
 * @param {Object|Array} coords
 * @returns {string}
 */
export const formatCoords = (coords) => {
  const latLng = toLatLng(coords);
  if (!latLng) return 'Location unavailable';

  const [lat, lng] = latLng;
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';

  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
};

/**
 * Calculates great-circle distance between two locations in kilometers using the Haversine formula.
 *
 * @param {Object|Array} point1
 * @param {Object|Array} point2
 * @returns {number|null} distance in km
 */
export const calculateDistanceKm = (point1, point2) => {
  const p1 = toLatLng(point1);
  const p2 = toLatLng(point2);

  if (!p1 || !p2) return null;

  const [lat1, lon1] = p1;
  const [lat2, lon2] = p2;

  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

export default {
  toLatLng,
  toGeoJSONPoint,
  isValidCoordinate,
  formatCoords,
  calculateDistanceKm,
};
