import express from 'express';
import * as incidentController from '../controllers/incidentController.js';
import validate from '../middleware/validate.js';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import {
  createIncidentSchema,
  updateStatusSchema,
  assignResponderSchema,
  cancelIncidentSchema,
  overrideSeveritySchema,
  reportResponderSchema,
} from '../validators/incidentValidator.js';
import { reportResponderLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// All incident endpoints require authentication
router.use(protect);

// Create and List incidents
router.post(
  '/',
  validate(createIncidentSchema),
  incidentController.createIncident
);

router.get('/', incidentController.listIncidents);

// Fetch single incident with IDOR protection
router.get('/:id', incidentController.getIncident);

// Update status (assigned RESPONDER or ADMIN)
router.patch(
  '/:id/status',
  authorize(ROLES.RESPONDER, ROLES.ADMIN),
  validate(updateStatusSchema),
  incidentController.updateStatus
);

// Admin-specific actions
router.post(
  '/:id/assign',
  authorize(ROLES.ADMIN),
  validate(assignResponderSchema),
  incidentController.assignResponder
);

router.patch(
  '/:id/severity',
  authorize(ROLES.ADMIN),
  validate(overrideSeveritySchema),
  incidentController.overrideSeverity
);

router.post(
  '/:id/reject',
  authorize(ROLES.ADMIN),
  validate(cancelIncidentSchema),
  incidentController.rejectIncident
);

// Cancellation (Creator USER or ADMIN)
router.post(
  '/:id/cancel',
  validate(cancelIncidentSchema),
  incidentController.cancelIncident
);

// Report responder for safety concern ("I feel unsafe" - Creator only)
router.post(
  '/:id/report-responder',
  reportResponderLimiter,
  validate(reportResponderSchema),
  incidentController.reportResponder
);

// Medical Info access (Assigned RESPONDER only; live check)
router.get(
  '/:id/medical-info',
  authorize(ROLES.RESPONDER),
  incidentController.getIncidentMedicalInfo
);

export default router;

