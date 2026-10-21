import { success } from '../../src/utils/response.js';
import { updateVanLocation } from './van.service.js';

export async function postVanLocation(req, res, next) {
  try {
    const { vanId } = req.validated.params;
    const { latitude, longitude, recordedAt } = req.validated.body;

    const data = await updateVanLocation({
      vanId,
      driverId: req.user.id,
      latitude,
      longitude,
      recordedAt
    });

    return success(res, data, 'Location updated');
  } catch (error) {
    return next(error);
  }
}
