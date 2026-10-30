import { z } from 'zod';

/**
 * Validation schema for GET /api/places/nearby query parameters.
 * Validates latitude, longitude, search radius, and amenity type.
 */
export const nearbyPlacesQuerySchema = z.object({
  lat: z.coerce
    .number({
      required_error: 'Latitude is required',
      invalid_type_error: 'Latitude must be a valid number',
    })
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90'),
  lng: z.coerce
    .number({
      required_error: 'Longitude is required',
      invalid_type_error: 'Longitude must be a valid number',
    })
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180'),
  radius: z.coerce
    .number()
    .min(1, 'Radius must be at least 1 metre')
    .max(10000, 'Radius cannot exceed 10000 metres')
    .default(5000),
  type: z.enum(['hospital', 'police', 'all']).default('all'),
});
