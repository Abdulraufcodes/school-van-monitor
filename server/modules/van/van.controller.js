import { success } from '../../src/utils/response.js';
import {updateVanLocation,listSchoolVans,createSchoolVan} from './van.service.js';

export async function postVanLocation(req, res, next) {
  try {
    const { vanId } = req.validated.params;
    const { latitude, longitude, recordedAt } = req.validated.body;

    const data = await updateVanLocation({
      vanId,
      driverId: req.user.id,
      driverSchoolId: req.user.schoolId,
      latitude,
      longitude,
      recordedAt
    });

    return success(res, data, 'Location updated');
  } catch (error) {
    return next(error);
  }
}


export async function getSchoolVansController(req, res, next) {
  try {
    const vans = await listSchoolVans(req.schoolId);
    return success(res, vans, 'Vans retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

export async function createSchoolVanController(req, res, next) {
  try {
    const van = await createSchoolVan({
      schoolId: req.schoolId,
      ...req.validated.body
    });

    return success(res, van, 'Van created successfully', 201);
  } catch (error) {
    return next(error);
  }
}


