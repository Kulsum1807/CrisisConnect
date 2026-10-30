import api from './api.js';

/**
 * Service for querying nearby hospitals and police stations from OpenStreetMap / Overpass API.
 */
export const placesService = {
  /**
   * Fetch nearby emergency amenities (hospitals, police stations).
   *
   * @param {Object} params
   * @param {number} params.lat - Latitude
   * @param {number} params.lng - Longitude
   * @param {number} [params.radius=5000] - Search radius in metres (max 10000)
   * @param {'hospital'|'police'|'all'} [params.type='all'] - Amenity filter
   * @returns {Promise<Array>} List of nearby places sorted by distance
   */
  async getNearbyPlaces({ lat, lng, radius = 5000, type = 'all' }) {
    const res = await api.get('/places/nearby', {
      params: { lat, lng, radius, type },
    });
    return res.data.data?.places ?? [];
  },
};

export default placesService;
