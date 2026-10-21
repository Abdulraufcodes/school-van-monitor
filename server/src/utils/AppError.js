export class AppError extends Error {
  constructor(statusCode, code, message, errors) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
