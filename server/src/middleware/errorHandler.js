import { AppError } from '../utils/AppError.js';
import { failure } from '../utils/response.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route not found: ${req.method} ${req.originalUrl}`));
}

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return;
  if (error instanceof AppError) {
    return failure(res, {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      errors: error.errors
    });
  }

  // Keep implementation details in server logs, not in the API response.
  console.error(error);
  return failure(res, {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred'
  });
}
