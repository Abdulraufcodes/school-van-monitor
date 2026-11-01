import { success } from '../../src/utils/response.js';
import { listSchoolDrivers } from './driver.service.js';

export async function getSchoolDriversController(req, res, next) {
  try {
    const drivers = await listSchoolDrivers(req.schoolId);
    return success(res, drivers, 'Drivers retrieved successfully');
  } catch (error) {
    return next(error);
  }
}
