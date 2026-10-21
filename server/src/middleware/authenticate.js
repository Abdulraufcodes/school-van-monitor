import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  const [scheme, token] = header?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'A valid bearer token is required'));
  }
  if (!process.env.JWT_ACCESS_SECRET) {
    return next(new Error('JWT_ACCESS_SECRET is not configured'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (!payload.sub || !payload.role) {
      throw new Error('Required claims missing');
    }
    req.user = { id: String(payload.sub), role: String(payload.role) };
    return next();
  } catch {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Token is invalid or expired'));
  }
}
