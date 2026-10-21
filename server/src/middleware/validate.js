import { AppError } from '../utils/AppError.js';

export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      params: req.params,
      query: req.query,
      body: req.body
    });

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message
      }));
      return next(new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', errors));
    }

    req.validated = result.data;
    return next();
  };
}
