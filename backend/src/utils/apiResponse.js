/**
 * Standard API response envelope helpers.
 *
 * Success envelope:
 * { success: true, message: string, data: any }
 *
 * Error envelope:
 * { success: false, message: string, code: string, errors?: any }
 */

export const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (
  res,
  statusCode = 500,
  message = 'Internal server error',
  errorCode = 'SERVER_ERROR',
  errors = null
) => {
  const payload = {
    success: false,
    message,
    code: errorCode,
  };

  if (errors !== null && errors !== undefined) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

export const paginatedResponse = (
  res,
  statusCode = 200,
  message = 'Success',
  { items, page, limit, total }
) => {
  const totalPages = Math.ceil(total / limit) || 1;
  return res.status(statusCode).json({
    success: true,
    message,
    data: {
      items,
      page: Number(page),
      limit: Number(limit),
      total: Number(total),
      totalPages,
    },
  });
};
