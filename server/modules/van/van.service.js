import mongoose from 'mongoose';
import User from '../auth/User.model.js';
import { Van } from './van.model.js';
import { Trip } from '../trip/trip.model.js';
import { LocationUpdate } from '../location/location.model.js';
import { AppError } from '../../src/utils/AppError.js';
import { emitTripLocationUpdate } from '../../src/sockets/socketServer.js';

export async function updateVanLocation({ vanId, driverId, driverSchoolId, latitude, longitude, recordedAt }) {
  if (
    !driverSchoolId ||
    !mongoose.isValidObjectId(driverSchoolId)
  ) {
    throw new AppError(
      403,
      'SCHOOL_ACCESS_DENIED',
      'A valid school association is required'
    );
  }

  const van = await Van.findById(vanId).lean();

  if (!van || !van.isActive) {
    throw new AppError(
      404,
      'VAN_NOT_FOUND',
      'Van was not found or is inactive'
    );
  }

  if (String(van.schoolId) !== String(driverSchoolId)) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'This van does not belong to your school'
    );
  }

  if (String(van.assignedDriver) !== String(driverId)) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You are not assigned to this van'
    );
  }

  const trip = await Trip.findOne({
    schoolId: van.schoolId,
    vanId: van._id,
    driverId,
    status: 'active'
  })
    .sort({ startedAt: -1 })
    .lean();

  if (!trip) {
    throw new AppError(
      409,
      'NO_ACTIVE_TRIP',
      'An active trip is required to update location'
    );
  }

  // Record when the server received this GPS update.
  const receivedAt = new Date();

  // Use the timestamp sent by the driver's device.
  // If the device doesn't send one, fall back to server time.
  const effectiveRecordedAt = recordedAt
    ? new Date(recordedAt)
    : receivedAt;

  // Reject timestamps more than 30 seconds ahead of server time.
  // This allows small differences between the device and server clocks.
  if (
    effectiveRecordedAt.getTime() >
    receivedAt.getTime() + 30_000
  ) {
    throw new AppError(
      400,
      'INVALID_LOCATION_TIMESTAMP',
      'Location timestamp cannot be in the future'
    );
  }

  // Find the newest GPS location already saved for this trip.
  // Sorting by -1 puts the latest recordedAt timestamp first.
  // Selecting only recordedAt avoids fetching unnecessary fields.
  const latestLocation = await LocationUpdate.findOne({
    tripId: trip._id
  })
    .sort({ recordedAt: -1 })
    .select('recordedAt')
    .lean();

  // Reject duplicate or out-of-order GPS updates.
  // Each accepted update must have a timestamp newer than the last one.
  if (
    latestLocation &&
    effectiveRecordedAt.getTime() <=
    new Date(latestLocation.recordedAt).getTime()
  ) {
    throw new AppError(
      409,
      'STALE_LOCATION_UPDATE',
      'Location timestamp must be newer than the latest recorded location'
    );
  }

  // Save the GPS update only after the timestamp checks pass.
  const location = await LocationUpdate.create({
    vanId: van._id,
    tripId: trip._id,
    driverId,
    latitude,
    longitude,
    recordedAt: effectiveRecordedAt,
    receivedAt
  });

  const locationData = {
    vanId: String(van._id),
    tripId: String(trip._id),
    latitude: location.latitude,
    longitude: location.longitude,
    recordedAt: location.recordedAt.toISOString(),
    receivedAt: location.receivedAt.toISOString()
  };

  // Only broadcast after MongoDB successfully saves the update.
  emitTripLocationUpdate(locationData);

  return locationData;
}


export async function listSchoolVans(schoolId) {
  return Van.find({ schoolId })
    .select('registrationNumber schoolId assignedDriver isActive createdAt updatedAt')
    .sort({ registrationNumber: 1 })
    .lean();
}

export async function createSchoolVan({
  schoolId,
  registrationNumber,
  assignedDriver
}) {
  const driver = await User.findOne({
    _id: assignedDriver,
    role: 'driver',
    schoolId,
    isActive: true
  }).select('_id').lean();

  if (!driver) {
    throw new AppError(
      400,
      'INVALID_DRIVER',
      'Assigned driver must be an active driver belonging to your school'
    );
  }

  try {
    const van = await Van.create({
      schoolId,
      registrationNumber,
      assignedDriver: driver._id
    });

    return {
      id: String(van._id),
      registrationNumber: van.registrationNumber,
      schoolId: String(van.schoolId),
      assignedDriver: String(van.assignedDriver),
      isActive: van.isActive,
      createdAt: van.createdAt,
      updatedAt: van.updatedAt
    };
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        409,
        'VAN_ALREADY_EXISTS',
        'A van with this registration number already exists'
      );
    }

    throw error;
  }
}
