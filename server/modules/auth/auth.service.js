import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from './auth.model.js';
import { AppError } from '../../src/utils/AppError.js';

export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');

  // Use the same response for unknown emails and incorrect passwords.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email or password'
    );
  }

  if (!user.isActive) {
    throw new AppError(
      401,
      'INVALID_CREDENTIALS',
      'Invalid email or password'
    );
  }

  const secret = process.env.JWT_ACCESS_SECRET;

  if (!secret) {
    throw new AppError(
      500,
      'CONFIGURATION_ERROR',
      'Authentication is not configured'
    );
  }

  const accessToken = jwt.sign(
    { role: user.role },
    secret,
    {
      subject: String(user._id),
      expiresIn: '15m'
    }
  );

  return {
    accessToken,
    user: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId ? String(user.schoolId) : null
    }
  };
}
