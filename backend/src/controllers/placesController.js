import asyncHandler from '../utils/asyncHandler.js';
import { successResponse } from '../utils/apiResponse.js';
import * as placesService from '../services/placesService.js';

/**
 * Controller to fetch hospitals and police stations near a location.
 * Route: GET /api/places/nearby
 */
export const getNearbyPlaces = asyncHandler(async (req, res) => {
  const { lat, lng, radius, type } = req.query;

  const places = await placesService.getNearbyPlaces({
    lat,
    lng,
    radius,
    type,
  });

  return successResponse(res, 200, 'Nearby places retrieved successfully', { places });
});

export default {
  getNearbyPlaces,
};
