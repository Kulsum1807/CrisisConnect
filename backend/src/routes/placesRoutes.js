import express from 'express';
import * as placesController from '../controllers/placesController.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { nearbyPlacesQuerySchema } from '../validators/placesValidator.js';

const router = express.Router();

// All nearby places endpoints require authentication and rate limiting
router.use(protect);
router.use(authLimiter);

router.get(
  '/nearby',
  validate(nearbyPlacesQuerySchema, 'query'),
  placesController.getNearbyPlaces
);

export default router;
