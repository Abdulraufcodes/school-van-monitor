import { success } from '../../src/utils/response.js';

import {
  startTrip,
  getActiveTrip,
  endTrip,
  getLatestTripLocation,
  getSchoolActiveTripLocations
} from './trip.service.js';

// Start a trip for the authenticated driver.
export async function startTripController(req, res, next) {
  try {
    const trip = await startTrip({
      vanId: req.validated.body.vanId,
      tripType: req.validated.body.tripType,
      driverId: req.user.id,
      schoolId: req.user.schoolId
    });

    return success(res, trip, 'Trip started successfully', 201);
  } catch (error) {
    return next(error);
  }
}

// Retrieve the authenticated driver's active trip.
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

// Complete an active trip.
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

// Retrieve the latest GPS location for a trip.
// Only authorized parents and admins can access this endpoint.
export async function getLatestTripLocationController(req, res, next) {
  try {
    const location = await getLatestTripLocation({
      tripId: req.validated.params.tripId,
      userId: req.user.id,
      role: req.user.role,

      // Admin school middleware provides the verified school ID.
      // For parents, the service independently reloads their account.
      schoolId: req.schoolId ?? req.user.schoolId
    });

    return success(
      res,
      location,
      'Latest trip location retrieved successfully'
    );
  } catch (error) {
    return next(error);
  }
}

// Retrieve all active trip locations for the authenticated school admin.
export async function getSchoolActiveTripLocationsController(
  req,
  res,
  next
) {
  try {
    const trips = await getSchoolActiveTripLocations({
      schoolId: req.schoolId
    });

    return success(
      res,
      { trips },
      'School active trip locations retrieved successfully'
    );
  } catch (error) {
    return next(error);
  }
}
