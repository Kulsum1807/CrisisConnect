import express from 'express';
import * as userController from '../controllers/userController.js';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/authValidator.js';
import {
  createEmergencyContactSchema,
  updateEmergencyContactSchema,
} from '../validators/contactValidator.js';
import { updateMedicalInfoSchema } from '../validators/medicalValidator.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

router.get('/me', userController.getProfile);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.patch('/me/password', validate(changePasswordSchema), userController.changePassword);

// Emergency Contacts endpoints
router.get('/me/emergency-contacts', userController.getEmergencyContacts);
router.post(
  '/me/emergency-contacts',
  validate(createEmergencyContactSchema),
  userController.addEmergencyContact
);
router.patch(
  '/me/emergency-contacts/:contactId',
  validate(updateEmergencyContactSchema),
  userController.updateEmergencyContact
);
router.delete(
  '/me/emergency-contacts/:contactId',
  userController.deleteEmergencyContact
);

// Medical Info endpoints (private health data)
router.get('/me/medical-info', userController.getMedicalInfo);
router.put(
  '/me/medical-info',
  validate(updateMedicalInfoSchema),
  userController.updateMedicalInfo
);
router.delete('/me/medical-info', userController.deleteMedicalInfo);

export default router;


