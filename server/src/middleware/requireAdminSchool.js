import mongoose from 'mongoose';
import School from '../../modules/school/school.model.js';
import { AppError } from '../utils/AppError.js';

export async function requireAdminSchool(req, _res, next) {
  try {
    // Only admins may pass this middleware.
    if (req.user?.role !== 'admin') {
      return next(
        new AppError(403, 'FORBIDDEN', 'Admin access required')
      );
    }

    const { schoolId } = req.user;

    // The authenticated admin must have a valid school ID.
    if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
      return next(
        new AppError(
          403,
          'SCHOOL_ACCESS_DENIED',
          'A valid school association is required'
        )
      );
    }

    // Verify that the school exists and is active.
    const school = await School.findById(schoolId).select('isActive');

    if (!school || !school.isActive) {
      return next(
        new AppError(
          403,
          'SCHOOL_ACCESS_DENIED',
          'School is unavailable'
        )
      );
    }

    req.schoolId = String(school._id);

    return next();
  } catch (error) {
    return next(error);
  }
}
