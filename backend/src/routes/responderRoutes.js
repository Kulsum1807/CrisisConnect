import express from 'express';
import * as responderController from '../controllers/responderController.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  updateAvailabilitySchema,
  updateLocationSchema,
} from '../validators/responderValidator.js';

const router = express.Router();

// All responder endpoints require authentication and RESPONDER role
router.use(protect);
router.use(authorize(ROLES.RESPONDER));

router.patch(
  '/status',
  validate(updateAvailabilitySchema),
  responderController.updateStatus
);

router.patch(
  '/location',
  validate(updateLocationSchema),
  responderController.updateLocation
);

router.get('/incidents', responderController.getIncidents);

router.post('/incidents/:id/accept', responderController.acceptIncident);

router.post('/incidents/:id/decline', responderController.declineIncident);

export default router;
