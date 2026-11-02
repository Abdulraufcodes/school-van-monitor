import jwt from 'jsonwebtoken';
import User from '../../modules/auth/User.model.js';
import { AppError } from '../utils/AppError.js';

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  const [scheme, token] = header?.split(' ') ?? [];

  if (scheme !== 'Bearer' || !token) {
    return next(
      new AppError(
        401,
        'UNAUTHENTICATED',
        'A valid bearer token is required'
      )
    );
  }

  if (!process.env.JWT_ACCESS_SECRET) {
    return next(new Error('JWT_ACCESS_SECRET is not configured'));
  }

  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch {
    return next(
      new AppError(
        401,
        'UNAUTHENTICATED',
        'Token is invalid or expired'
      )
    );
  }

  if (
    typeof payload === 'string' ||
    !payload.sub ||
    typeof payload.sub !== 'string'
  ) {
    return next(
      new AppError(
        401,
        'UNAUTHENTICATED',
        'Token is invalid or expired'
      )
    );
  }

  try {
    const user = await User.findById(payload.sub)
      .select('name email role schoolId isActive accountStatus passwordChangedAt');

    if (!user || !user.isActive) {
      return next(
        new AppError(
          401,
          'UNAUTHENTICATED',
          'User account is unavailable'
        )
      );
    }

    if (user.accountStatus === 'pending_activation' || (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000)) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Account session is no longer valid'));
    }

    req.user = {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId ? String(user.schoolId) : null
    };

    return next();
  } catch (error) {
    if (error.name === 'CastError') {
      return next(
        new AppError(
          401,
          'UNAUTHENTICATED',
          'Token is invalid or expired'
        )
      );
    }

    return next(error);
  }
}
