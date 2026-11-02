import { success } from '../../src/utils/response.js';
import { listAssignedVans, listSchoolDrivers } from './driver.service.js';

export async function getMyAssignedVansController(req, res, next) {
  try {
    const vans = await listAssignedVans({
      driverId: req.user.id,
      schoolId: req.user.schoolId
    });
    return success(res, vans, 'Assigned vans retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

export async function getSchoolDriversController(req, res, next) {
  try {
    const drivers = await listSchoolDrivers(req.schoolId);
    return success(res, drivers, 'Drivers retrieved successfully');
  } catch (error) {
    return next(error);
  }
}
