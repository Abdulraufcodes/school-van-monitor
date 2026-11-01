import User from '../auth/User.model.js';

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
