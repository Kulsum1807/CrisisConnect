import AppError from '../utils/AppError.js';

/**
 * Middleware factory for validating request bodies, query params, or route params with Zod schemas.
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to parse against
 * @param {'body' | 'query' | 'params'} source - Request property to validate (default 'body')
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Format Zod issues into clear field-specific messages
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(
        new AppError('Validation failed', 400, 'VALIDATION_ERROR', errors)
      );
    }

    // Replace with parsed/sanitized data from Zod
    if (source === 'query') {
      try {
        req.query = result.data;
      } catch {
        for (const key of Object.keys(req.query)) {
          delete req.query[key];
        }
        Object.assign(req.query, result.data);
      }
    } else {
      req[source] = result.data;
    }
    next();
  };
};

export default validate;
