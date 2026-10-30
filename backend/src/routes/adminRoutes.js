import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../constants/roles.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// All admin routes require authentication and ADMIN role
router.use(protect);
router.use(authorize(ROLES.ADMIN));

// Responders management
router.get('/responders', adminController.getResponders);
router.patch('/responders/:id/verify', adminController.verifyResponder);

// Dashboard overview & analytics
router.get('/dashboard', adminController.getDashboardStats);
router.get('/analytics', adminController.getAnalytics);

// User account management
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);

export default router;
