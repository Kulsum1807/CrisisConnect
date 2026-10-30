import { z } from 'zod';
import { RELATIONSHIP_VALUES } from '../constants/contacts.js';

const phoneRegex = /^\+?\d{10,15}$/;

export const createEmergencyContactSchema = z.object({
  name: z
    .string({ required_error: 'Contact name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be at most 60 characters'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(phoneRegex, 'Please provide a valid phone number (10 to 15 digits)'),
  relationship: z.enum(RELATIONSHIP_VALUES, {
    errorMap: () => ({ message: 'Invalid relationship type' }),
  }),
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .nullish()
    .or(z.literal(''))
    .transform((val) => (val ? val : undefined)),
  isPrimary: z.boolean().optional().default(false),
});

export const updateEmergencyContactSchema = z.object({
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
  relationship: z
    .enum(RELATIONSHIP_VALUES, {
      errorMap: () => ({ message: 'Invalid relationship type' }),
    })
    .optional(),
  email: z
    .string()
    .trim()
    .email('Please provide a valid email address')
    .nullish()
    .or(z.literal(''))
    .transform((val) => (val ? val : undefined))
    .optional(),
  isPrimary: z.boolean().optional(),
});
