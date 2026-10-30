import env from '../config/env.js';
import AppError from '../utils/AppError.js';
import logger from '../utils/logger.js';

// In-memory cache with 10-minute TTL
const placesCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Reset places cache (primarily for unit test isolation).
 */
export const clearPlacesCache = () => {
  placesCache.clear();
};

/**
 * Calculates great-circle distance in meters between two lat/lng coordinates using Haversine formula.
 */
export const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's mean radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

/**
 * Builds the Overpass QL query string based on amenity type, radius, and coordinate center.
 */
export const buildOverpassQuery = (lat, lng, radius, type) => {
  let filterLines = '';
  if (type === 'hospital') {
    filterLines = `  nwr["amenity"="hospital"](around:${radius},${lat},${lng});`;
  } else if (type === 'police') {
    filterLines = `  nwr["amenity"="police"](around:${radius},${lat},${lng});`;
  } else {
    filterLines = `  nwr["amenity"="hospital"](around:${radius},${lat},${lng});\n  nwr["amenity"="police"](around:${radius},${lat},${lng});`;
  }

  return `[out:json][timeout:10];\n(\n${filterLines}\n);\nout center tags 30;`;
};

/**
 * Fetch nearby hospitals and police stations from OpenStreetMap via Overpass API.
 * Uses Node's built-in fetch with an 8-second timeout, in-memory 10-minute cache,
 * and distance sorting.
 *
 * @param {Object} params
 * @param {number} params.lat - Query latitude
 * @param {number} params.lng - Query longitude
 * @param {number} [params.radius=5000] - Search radius in metres (max 10000)
 * @param {'hospital'|'police'|'all'} [params.type='all'] - Amenity filter
 * @returns {Promise<Array>} List of at most 20 nearby places sorted by distance
 */
export const getNearbyPlaces = async ({ lat, lng, radius = 5000, type = 'all' }) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  const numRadius = Number(radius);

  // 1. Check in-memory cache
  const cacheKey = `${numLat.toFixed(3)}_${numLng.toFixed(3)}_${numRadius}_${type}`;
  const cachedEntry = placesCache.get(cacheKey);

  if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
    return cachedEntry.data;
  }

  // 2. Build Overpass QL query
  const query = buildOverpassQuery(numLat, numLng, numRadius, type);

  // 3. Fetch from Overpass API (with fallback endpoints and 8-second total AbortController timeout)
  const candidateEndpoints = [
    env.OVERPASS_URL || 'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass.openstreetmap.fr/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  const endpoints = [...new Set(candidateEndpoints)];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  let responseData = null;
  let lastError = null;

  for (const endpoint of endpoints) {
    if (controller.signal.aborted) break;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'CrisisConnect/1.0 (Emergency Response Platform; contact@crisisconnect.org)',
        },
        body: new URLSearchParams({ data: query }).toString(),
        signal: controller.signal,
      });

      if (res.ok) {
        responseData = await res.json();
        break; // Successfully obtained data
      } else {
        lastError = new Error(`Overpass API mirror [${endpoint}] responded with HTTP status ${res.status}`);
      }
    } catch (err) {
      lastError = err;
      if (controller.signal.aborted) {
        break;
      }
    }
  }

  clearTimeout(timeoutId);

  if (!responseData) {
    logger.warn({ err: lastError?.message, lat: numLat, lng: numLng }, 'Overpass API request failed or timed out across all mirrors');
    throw new AppError(
      'Nearby emergency services directory is temporarily unavailable. Please try again shortly or call 112 in an emergency.',
      503,
      'SERVICE_UNAVAILABLE'
    );
  }

  // 4. Map and filter raw Overpass elements
  const rawElements = Array.isArray(responseData?.elements) ? responseData.elements : [];
  const mappedPlaces = [];

  for (const element of rawElements) {
    const amenity = element.tags?.amenity;
    if (amenity !== 'hospital' && amenity !== 'police') {
      continue;
    }

    // Nodes use element.lat/lon; ways and relations with "out center" use element.center.lat/lon
    const placeLat = element.lat !== undefined ? element.lat : element.center?.lat;
    const placeLng = element.lon !== undefined ? element.lon : element.center?.lon;

    if (
      placeLat === undefined ||
      placeLng === undefined ||
      isNaN(placeLat) ||
      isNaN(placeLng)
    ) {
      continue;
    }

    const name =
      element.tags?.name ||
      (amenity === 'hospital' ? 'Unnamed hospital' : 'Unnamed police station');

    const phone =
      element.tags?.phone ||
      element.tags?.['contact:phone'] ||
      null;

    const distanceMeters = calculateDistanceMeters(numLat, numLng, placeLat, placeLng);

    mappedPlaces.push({
      id: String(element.id),
      type: amenity,
      name,
      lat: placeLat,
      lng: placeLng,
      phone,
      distanceMeters,
    });
  }

  // 5. Sort by distance ascending and cap at 20 results
  mappedPlaces.sort((a, b) => a.distanceMeters - b.distanceMeters);
  const results = mappedPlaces.slice(0, 20);

  // 6. Cache results for 10 minutes
  placesCache.set(cacheKey, {
    data: results,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return results;
};

export default {
  getNearbyPlaces,
  buildOverpassQuery,
  calculateDistanceMeters,
  clearPlacesCache,
};
