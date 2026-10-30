import { z } from 'zod';
import { CATEGORY_VALUES } from '../constants/categories.js';
import { STATUS_VALUES } from '../constants/statuses.js';
import { SEVERITY_VALUES } from '../constants/severities.js';

export const createIncidentSchema = z
  .object({
    isSOS: z.boolean().optional().default(false),
    category: z.enum(CATEGORY_VALUES, {
      errorMap: () => ({ message: 'Invalid incident category' }),
    }).optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    location: z
      .object({
        lat: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
        lng: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
      })
      .optional(),
    address: z.string().trim().max(500).optional(),
    checklist: z
      .object({
        conscious: z.boolean().optional(),
        breathing: z.boolean().optional(),
        severeBleeding: z.boolean().optional(),
        inDangerNow: z.boolean().optional(),
        injuries: z.boolean().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // If NOT SOS, category and description are strictly required
      if (!data.isSOS) {
        return Boolean(data.category) && Boolean(data.description && data.description.length > 0);
      }
      return true;
    },
    {
      message: 'Category and description are required for manual incident reports',
      path: ['category'],
    }
  );

export const updateStatusSchema = z.object({
  status: z.enum(STATUS_VALUES, {
    errorMap: () => ({ message: 'Invalid incident status' }),
  }),
  note: z.string().trim().max(500).optional(),
});

export const assignResponderSchema = z.object({
  responderId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid responder ID format'),
});

export const cancelIncidentSchema = z.object({
  reason: z
    .string({ required_error: 'Cancellation reason is required' })
    .trim()
    .min(1, 'Reason cannot be empty')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export const overrideSeveritySchema = z.object({
  severity: z.enum(SEVERITY_VALUES, {
    errorMap: () => ({ message: 'Invalid severity value' }),
  }),
  reason: z
    .string({ required_error: 'Override reason is required' })
    .trim()
    .min(1, 'Reason cannot be empty')
    .max(500, 'Reason cannot exceed 500 characters'),
});

export const reportResponderSchema = z.object({
  reason: z
    .string()
    .trim()
    .max(300, 'Reason cannot exceed 300 characters')
    .optional()
    .default(''),
});

