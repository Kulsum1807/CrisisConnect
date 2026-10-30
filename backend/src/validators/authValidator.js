import { z } from 'zod';
import { CATEGORIES } from '../constants/categories.js';

// Phone regex matching +91... or 10-15 digits
const phoneRegex = /^\+?\d{10,15}$/;

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address'),
  phone: z
    .string({ required_error: 'Phone is required' })
    .trim()
    .regex(phoneRegex, 'Please provide a valid phone number (10 to 15 digits)'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
});

import { RESPONDER_TYPE_VALUES } from '../constants/responder.js';

export const registerResponderSchema = registerSchema.extend({
  responderType: z.enum(RESPONDER_TYPE_VALUES, {
    required_error: 'Responder type is required (PROFESSIONAL or VOLUNTEER)',
    invalid_type_error: 'Responder type must be PROFESSIONAL or VOLUNTEER',
  }),
  organisation: z
    .string({ required_error: 'Organisation is required' })
    .trim()
    .min(1, 'Organisation is required')
    .max(100, 'Organisation name must be at most 100 characters'),
  referenceContact: z
    .string({ required_error: 'Reference contact is required' })
    .trim()
    .min(1, 'Reference contact is required')
    .max(100, 'Reference contact must be at most 100 characters'),
  specialization: z
    .array(z.string().trim())
    .optional()
    .default([]),
  verificationNote: z
    .string()
    .trim()
    .max(500, 'Verification note must be at most 500 characters')
    .optional(),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters')
    .optional(),
  phone: z
    .string()
    .trim()
    .regex(phoneRegex, 'Please provide a valid phone number (10 to 15 digits)')
    .optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password is required'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must be at most 128 characters'),
});
