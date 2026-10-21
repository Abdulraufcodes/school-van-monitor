import { Van } from './van.model.js';
import { Trip } from '../trip/trip.model.js';
import { LocationUpdate } from '../location/location.model.js';
import { AppError } from '../../src/utils/AppError.js';

export async function updateVanLocation({ vanId, driverId, latitude, longitude, recordedAt }) {
  const van = await Van.findById(vanId).lean();
  if (!van || !van.isActive) {
    throw new AppError(404, 'VAN_NOT_FOUND', 'Van was not found or is inactive');
  }

  if (String(van.assignedDriver) !== String(driverId)) {
    throw new AppError(403, 'FORBIDDEN', 'You are not assigned to this van');
  }

  const trip = await Trip.findOne({
    vanId: van._id,
    driverId,
    status: 'active'
  }).sort({ startedAt: -1 }).lean();

  if (!trip) {
    throw new AppError(409, 'NO_ACTIVE_TRIP', 'An active trip is required to update location');
  }

  const receivedAt = new Date();
  const location = await LocationUpdate.create({
    vanId: van._id,
    tripId: trip._id,
    driverId,
    latitude,
    longitude,
    recordedAt: recordedAt ? new Date(recordedAt) : receivedAt,
    receivedAt
  });

  return {
    vanId: String(van._id),
    tripId: String(trip._id),
    latitude: location.latitude,
    longitude: location.longitude,
    recordedAt: location.recordedAt.toISOString(),
    receivedAt: location.receivedAt.toISOString()
  };
}
