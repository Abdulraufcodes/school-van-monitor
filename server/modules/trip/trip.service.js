import mongoose from 'mongoose';

import { Trip } from './trip.model.js';
import { Van } from '../van/van.model.js';
import { LocationUpdate } from '../location/location.model.js';
import User from '../auth/User.model.js';
import Student from '../student/student.model.js';

import { AppError } from '../../src/utils/AppError.js';

// -----------------------------------------------------------------------------
// Shared helper functions
// -----------------------------------------------------------------------------

// Every trip operation must have a valid school association.
// This prevents queries from accidentally running without tenant isolation.
function requireSchoolId(schoolId) {
  if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
    throw new AppError(
      403,
      'SCHOOL_ACCESS_DENIED',
      'A valid school association is required'
    );
  }
}

// Convert a Mongoose Trip document into a predictable API response.
// This prevents internal database document details from leaking to clients.
function serializeTrip(trip) {
  return {
    id: String(trip._id),
    schoolId: String(trip.schoolId),
    vanId: String(trip.vanId),
    driverId: String(trip.driverId),
    status: trip.status,
    startedAt: trip.startedAt.toISOString(),
    endedAt: trip.endedAt
      ? trip.endedAt.toISOString()
      : null,
    createdAt: trip.createdAt,
    updatedAt: trip.updatedAt
  };
}

// MongoDB error code 11000 means a unique index was violated.
// We use this to handle simultaneous trip-start requests safely.
function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

// -----------------------------------------------------------------------------
// Start a trip
// -----------------------------------------------------------------------------

export async function startTrip({ vanId, driverId, schoolId }) {
  requireSchoolId(schoolId);

  // A driver can only start a trip using an active van assigned to them
  // and belonging to their own school.
  const van = await Van.findOne({
    _id: vanId,
    schoolId,
    assignedDriver: driverId,
    isActive: true
  }).lean();

  if (!van) {
    throw new AppError(
      404,
      'ASSIGNED_VAN_NOT_FOUND',
      'No active van assigned to this driver was found'
    );
  }

  // Prevent the driver or van from being involved in another active trip.
  const existingTrip = await Trip.findOne({
    schoolId,
    status: 'active',
    $or: [
      { vanId: van._id },
      { driverId }
    ]
  }).lean();

  if (existingTrip) {
    throw new AppError(
      409,
      'ACTIVE_TRIP_EXISTS',
      'This van or driver already has an active trip'
    );
  }

  try {
    const trip = await Trip.create({
      schoolId: van.schoolId,
      vanId: van._id,
      driverId,
      status: 'active',
      startedAt: new Date(),
      endedAt: null
    });

    return serializeTrip(trip);
  } catch (error) {
    // Database indexes protect against two requests starting
    // conflicting trips at almost exactly the same time.
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        409,
        'ACTIVE_TRIP_EXISTS',
        'This van or driver already has an active trip'
      );
    }

    throw error;
  }
}

// -----------------------------------------------------------------------------
// Get the authenticated driver's active trip
// -----------------------------------------------------------------------------

export async function getActiveTrip({ driverId, schoolId }) {
  requireSchoolId(schoolId);

  // Only return an active trip belonging to this driver and school.
  const trip = await Trip.findOne({
    driverId,
    schoolId,
    status: 'active'
  })
    .sort({ startedAt: -1 })
    .lean();

  // Returning null means the driver currently has no active trip.
  return trip ? serializeTrip(trip) : null;
}

// -----------------------------------------------------------------------------
// End a trip
// -----------------------------------------------------------------------------

export async function endTrip({ tripId, driverId, schoolId }) {
  requireSchoolId(schoolId);

  // Scope the lookup to the authenticated driver and their school.
  const trip = await Trip.findOne({
    _id: tripId,
    driverId,
    schoolId
  });

  // Do not reveal another driver's trip.
  if (!trip) {
    throw new AppError(
      404,
      'TRIP_NOT_FOUND',
      'Trip was not found'
    );
  }

  if (trip.status !== 'active') {
    throw new AppError(
      409,
      'TRIP_NOT_ACTIVE',
      'Only an active trip can be completed'
    );
  }

  // Conditional update protects against two simultaneous end requests.
  const completedTrip = await Trip.findOneAndUpdate(
    {
      _id: tripId,
      driverId,
      schoolId,
      status: 'active'
    },
    {
      $set: {
        status: 'completed',
        endedAt: new Date()
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!completedTrip) {
    throw new AppError(
      409,
      'TRIP_NOT_ACTIVE',
      'The trip was already completed or is no longer active'
    );
  }

  return serializeTrip(completedTrip);
}

// -----------------------------------------------------------------------------
// Get the latest location of an active trip
// -----------------------------------------------------------------------------

export async function getLatestTripLocation({
  tripId,
  userId,
  role,
  schoolId
}) {
  let authorizedSchoolId;

  // Only parents and admins are allowed to retrieve trip locations.
  // Drivers must use the GPS update endpoint, not this read endpoint.
  if (role !== 'parent' && role !== 'admin') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You do not have permission to view trip locations'
    );
  }

  if (role === 'admin') {
    // The admin's schoolId must come from the authenticated school context.
    // The route should run requireAdminSchool before calling this service.
    requireSchoolId(schoolId);

    authorizedSchoolId = schoolId;
  }

  if (role === 'parent') {
    // Reload the parent account from the database.
    // Never trust school or parent information supplied by the client.
    const parent = await User.findOne({
      _id: userId,
      role: 'parent',
      isActive: true
    })
      .select('_id schoolId role isActive')
      .lean();

    if (!parent?.schoolId) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Parent account is not associated with a school'
      );
    }

    authorizedSchoolId = parent.schoolId;
  }

  // Only active trips belonging to the authorized school can be viewed.
  // This also prevents parents from retrieving completed trips.
  const trip = await Trip.findOne({
    _id: tripId,
    schoolId: authorizedSchoolId,
    status: 'active'
  })
    .select('_id schoolId vanId status')
    .lean();

  if (!trip) {
    throw new AppError(
      404,
      'TRIP_NOT_FOUND',
      'Active trip was not found'
    );
  }

  if (role === 'parent') {
    // A parent can view a van only if at least one active student:
    // 1. Belongs to the same school.
    // 2. Is linked to this parent.
    // 3. Is assigned to this trip's van.
    const linkedStudent = await Student.exists({
      schoolId: authorizedSchoolId,
      parentIds: userId,
      assignedVanId: trip.vanId,
      isActive: true
    });

    if (!linkedStudent) {
      throw new AppError(
        403,
        'TRIP_ACCESS_DENIED',
        'You are not authorized to view this trip'
      );
    }
  }

  // Retrieve the most recently received location update.
  // receivedAt is server-generated, so it is more reliable for
  // determining freshness than the driver's device timestamp.
  const latestLocation = await LocationUpdate.findOne({
    tripId: trip._id
  })
    .sort({ receivedAt: -1 })
    .lean();

  // A trip can be active before its driver sends the first GPS update.
  // Return null instead of treating this as an error.
  if (!latestLocation) {
    return null;
  }

  // Read the stale-location threshold from environment configuration.
  // Use 60 seconds if the variable is missing or invalid.
  const configuredThreshold = Number(
    process.env.LOCATION_STALE_THRESHOLD_SECONDS ?? 60
  );

  const staleThresholdSeconds =
    Number.isFinite(configuredThreshold) && configuredThreshold >= 0
      ? configuredThreshold
      : 60;

  // Calculate location age using the server's receipt timestamp.
  const now = Date.now();
  const receivedAtMs = new Date(latestLocation.receivedAt).getTime();

  // Clamp negative ages to zero to avoid reporting a negative duration
  // if the server clock changes slightly.
  const ageInSeconds = Math.max(
    0,
    Math.floor((now - receivedAtMs) / 1000)
  );

  // A location becomes stale once its age exceeds the configured threshold.
  const isStale = ageInSeconds > staleThresholdSeconds;

  // Return only the fields needed by the frontend.
  // Do not return the complete MongoDB document.
  return {
    tripId: String(trip._id),
    vanId: String(trip.vanId),
    latitude: latestLocation.latitude,
    longitude: latestLocation.longitude,
    recordedAt: latestLocation.recordedAt.toISOString(),
    receivedAt: latestLocation.receivedAt.toISOString(),
    ageInSeconds,
    isStale
  };
}
