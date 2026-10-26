import { success } from '../../src/utils/response.js';

import {startTrip,getActiveTrip,endTrip} from './trip.service.js';

export async function startTripController(req, res, next) {
  try {
    const trip = await startTrip({
      vanId: req.validated.body.vanId,
      driverId: req.user.id,
      schoolId: req.user.schoolId
    });

    return success(res, trip, 'Trip started successfully', 201);
  } catch (error) {
    return next(error);
  }
}

export async function getActiveTripController(req, res, next) {
  try {
    const trip = await getActiveTrip({
      driverId: req.user.id,
      schoolId: req.user.schoolId
    });

    return success(res, { trip }, 'Active trip retrieved successfully');
  } catch (error) {
    return next(error);
  }
}

export async function endTripController(req, res, next) {
  try {
    const trip = await endTrip({
      tripId: req.validated.params.tripId,
      driverId: req.user.id,
      schoolId: req.user.schoolId
    });

    return success(res, trip, 'Trip completed successfully');
  } catch (error) {
    return next(error);
  }
}
