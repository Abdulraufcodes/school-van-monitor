import User from '../auth/User.model.js';
import mongoose from 'mongoose';
import { Van } from '../van/van.model.js';
import { AppError } from '../../src/utils/AppError.js';

export async function listAssignedVans({ driverId, schoolId }) {
  if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
    throw new AppError(403, 'SCHOOL_ACCESS_DENIED', 'A valid school association is required');
  }

  const vans = await Van.find({ assignedDriver: driverId, schoolId })
    .select('_id registrationNumber isActive')
    .sort({ registrationNumber: 1 })
    .lean();

  return vans.map((van) => ({
    id: String(van._id),
    registrationNumber: van.registrationNumber,
    isActive: van.isActive
  }));
}

export async function listSchoolDrivers(schoolId) {
  return User.find({
    role: 'driver',
    isActive: true,
    schoolId
  })
    .select('_id name email')
    .sort({ name: 1 })
    .lean();
}
