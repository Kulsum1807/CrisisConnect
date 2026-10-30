/**
 * GeoJSON and Map Coordinates Utility
 *
 * Ground Rule:
 * - GeoJSON standard order: [longitude, latitude]
 * - Leaflet / Client map order: [latitude, longitude] (or { lat, lng })
 */

/**
 * Converts client coordinates { lat, lng } or [lat, lng] to GeoJSON Point coordinates [lng, lat].
 *
 * @param {Object|Array} coords - { lat, lng } or [lat, lng]
 * @returns {[number, number]} [longitude, latitude]
 */
export const toGeoJSONPoint = (coords) => {
  if (!coords) return null;

  if (Array.isArray(coords)) {
    // If passed as [lat, lng]
    const [lat, lng] = coords;
    return [Number(lng), Number(lat)];
  }

  if (typeof coords === 'object' && coords.lat !== undefined && coords.lng !== undefined) {
    return [Number(coords.lng), Number(coords.lat)];
  }

  return null;
};

/**
 * Converts GeoJSON coordinates [lng, lat] to Leaflet / client format { lat, lng }.
 *
 * @param {[number, number]} geoCoords - [longitude, latitude]
 * @returns {{ lat: number, lng: number }|null}
 */
export const toLeafletCoords = (geoCoords) => {
  if (!Array.isArray(geoCoords) || geoCoords.length < 2) return null;
  return {
    lat: geoCoords[1],
    lng: geoCoords[0],
  };
};

/**
 * Validates latitude and longitude ranges.
 * Latitude: -90 to 90
 * Longitude: -180 to 180
 */
export const isValidCoordinate = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
};

/**
 * Calculates great-circle distance between two coordinates in kilometers using Haversine formula.
 * Supports GeoJSON coordinates [lng, lat], coordinate objects { lat, lng } or { coordinates: [lng, lat] }.
 *
 * @param {Array|Object} coord1
 * @param {Array|Object} coord2
 * @returns {number|null} distance in km
 */
export const calculateDistanceKm = (coord1, coord2) => {
  const extractLatLng = (coords) => {
    if (!coords) return null;
    if (Array.isArray(coords)) {
      // In GeoJSON standard: [lng, lat]
      return { lng: Number(coords[0]), lat: Number(coords[1]) };
    }
    if (typeof coords === 'object') {
      if (coords.coordinates && Array.isArray(coords.coordinates)) {
        return { lng: Number(coords.coordinates[0]), lat: Number(coords.coordinates[1]) };
      }
      if (coords.lat !== undefined && coords.lng !== undefined) {
        return { lng: Number(coords.lng), lat: Number(coords.lat) };
      }
    }
    return null;
  };

  const p1 = extractLatLng(coord1);
  const p2 = extractLatLng(coord2);

  if (
    !p1 ||
    !p2 ||
    isNaN(p1.lat) ||
    isNaN(p1.lng) ||
    isNaN(p2.lat) ||
    isNaN(p2.lng)
  ) {
    return null;
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
  const dLon = ((p2.lng - p1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((p1.lat * Math.PI) / 180) *
      Math.cos((p2.lat * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

