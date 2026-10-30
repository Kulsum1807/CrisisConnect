import { z } from 'zod';
import { BLOOD_GROUP_VALUES } from '../constants/medical.js';

const itemSchema = z
  .string()
  .trim()
  .max(60, 'Each item must be at most 60 characters');

/**
 * Validation schema for updating medical information.
 * Enforces string trimming and rejects unknown fields.
 */
export const updateMedicalInfoSchema = z
  .object({
    bloodGroup: z
      .enum(BLOOD_GROUP_VALUES, {
        errorMap: () => ({ message: 'Invalid blood group' }),
      })
      .optional()
      .default('UNKNOWN'),
    allergies: z
      .array(itemSchema)
      .max(10, 'Cannot exceed 10 allergy items')
      .optional()
      .default([]),
    conditions: z
      .array(itemSchema)
      .max(10, 'Cannot exceed 10 condition items')
      .optional()
      .default([]),
    medications: z
      .array(itemSchema)
      .max(10, 'Cannot exceed 10 medication items')
      .optional()
      .default([]),
    notes: z
      .string()
      .trim()
      .max(300, 'Notes cannot exceed 300 characters')
      .optional()
      .default(''),
    shareWithResponders: z.boolean().optional().default(false),
  })
  .strict();
