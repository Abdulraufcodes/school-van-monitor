import mongoose from 'mongoose';

import { Trip } from './trip.model.js';
import { Van } from '../van/van.model.js';
import { LocationUpdate } from '../location/location.model.js';
import User from '../auth/User.model.js';
import Student from '../student/student.model.js';
import { emitTripStatusUpdate } from '../../src/sockets/socketServer.js';
import { AppError } from '../../src/utils/AppError.js';
import { getServiceDate } from './serviceDate.js';

const TRIP_TYPES = ['morning_pickup', 'afternoon_dropoff'];

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
    tripType: trip.tripType ?? null,
    serviceDate: trip.serviceDate ?? null,
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

export async function startTrip({ vanId, tripType, driverId, schoolId }) {
  requireSchoolId(schoolId);

  if (!TRIP_TYPES.includes(tripType)) {
    throw new AppError(400, 'INVALID_TRIP_TYPE', 'A valid trip type is required');
  }

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

  const startedAt = new Date();
  const serviceDate = getServiceDate(startedAt);
  const sameTypeTrip = await Trip.exists({
    schoolId,
    vanId: van._id,
    serviceDate,
    tripType
  });

  if (sameTypeTrip) {
    throw new AppError(
      409,
      'TRIP_ALREADY_EXISTS',
      'A trip of this type already exists for this van and service date'
    );
  }

  try {
    const trip = await Trip.create({
      schoolId: van.schoolId,
      vanId: van._id,
      driverId,
      tripType,
      serviceDate,
      status: 'active',
      startedAt,
      endedAt: null
    });

    return serializeTrip(trip);
  } catch (error) {
    // Database indexes protect against two requests starting
    // conflicting trips at almost exactly the same time.
    if (isDuplicateKeyError(error)) {
      const dailyDuplicate = error.keyPattern?.serviceDate || error.keyPattern?.tripType
        ? true
        : Boolean(await Trip.exists({ schoolId, vanId: van._id, serviceDate, tripType }));
      if (dailyDuplicate) {
        throw new AppError(
          409,
          'TRIP_ALREADY_EXISTS',
          'A trip of this type already exists for this van and service date'
        );
      }
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

  // Convert the completed trip into the public response format.
  const result = serializeTrip(completedTrip);

  // Notify all authorized parents currently tracking this trip.
  emitTripStatusUpdate(result);

  return result;
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

  // Only parents and admins can retrieve trip locations.
  if (role !== 'parent' && role !== 'admin') {
    throw new AppError(
      403,
      'FORBIDDEN',
      'You do not have permission to view trip locations'
    );
  }

  if (role === 'admin') {
    // Admin access must be restricted to their verified school.
    requireSchoolId(schoolId);
    authorizedSchoolId = schoolId;
  }

  if (role === 'parent') {
    // Reload the parent account instead of trusting client-supplied details.
    const parent = await User.findOne({
      _id: userId,
      role: 'parent',
      isActive: true
    })
      .select('_id schoolId')
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

  // Only active trips belonging to the authorized school are trackable.
  const trip = await Trip.findOne({
    _id: tripId,
    schoolId: authorizedSchoolId,
    status: 'active'
  })
    .select('_id schoolId vanId driverId tripType serviceDate status startedAt')
    .lean();

  if (!trip) {
    throw new AppError(
      404,
      'TRIP_NOT_FOUND',
      'Active trip was not found'
    );
  }

  if (role === 'parent') {
    // A parent must have at least one active child assigned to this van.
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

  // Retrieve the van and driver associated with this trip.
  const [van, driver] = await Promise.all([
    Van.findOne({
      _id: trip.vanId,
      schoolId: authorizedSchoolId
    })
      .select('_id registrationNumber')
      .lean(),

    User.findOne({
      _id: trip.driverId,
      schoolId: authorizedSchoolId,
      role: 'driver'
    })
      .select('_id name')
      .lean()
  ]);

  if (!van || !driver) {
    throw new AppError(
      404,
      'TRIP_DETAILS_NOT_FOUND',
      'Associated van or driver information was not found'
    );
  }

  // Get the latest GPS update using the server receipt timestamp.
  const latestLocation = await LocationUpdate.findOne({
    tripId: trip._id
  })
    .sort({ receivedAt: -1 })
    .lean();

  // An active trip may not have received its first GPS update yet.
  // Still return trip information so the tracking screen can render.
  let location = null;

  if (latestLocation) {
    const configuredThreshold = Number(
      process.env.LOCATION_STALE_THRESHOLD_SECONDS ?? 60
    );

    const staleThresholdSeconds =
      Number.isFinite(configuredThreshold) &&
        configuredThreshold >= 0
        ? configuredThreshold
        : 60;

    const ageInSeconds = Math.max(
      0,
      Math.floor(
        (Date.now() -
          new Date(latestLocation.receivedAt).getTime()) / 1000
      )
    );

    location = {
      latitude: latestLocation.latitude,
      longitude: latestLocation.longitude,
      recordedAt: latestLocation.recordedAt.toISOString(),
      receivedAt: latestLocation.receivedAt.toISOString(),
      ageInSeconds,
      isStale: ageInSeconds > staleThresholdSeconds
    };
  }

  return {
    trip: {
      id: String(trip._id),
      status: trip.status,
      startedAt: trip.startedAt.toISOString(),
      tripType: trip.tripType ?? null,
      serviceDate: trip.serviceDate ?? null
    },

    van: {
      id: String(van._id),
      registrationNumber: van.registrationNumber
    },

    driver: {
      id: String(driver._id),
      name: driver.name
    },

    // Null means the trip is active but no GPS update has arrived yet.
    location
  };
}

// Retrieve every active trip and its latest GPS location
// for the authenticated school administrator.
export async function getSchoolActiveTripLocations({ schoolId }) {
  requireSchoolId(schoolId);

  // Only retrieve active trips belonging to this school.
  const trips = await Trip.find({
    schoolId,
    status: 'active'
  })
    .sort({ startedAt: -1 })
    .lean();

  if (!trips.length) {
    return [];
  }

  const tripIds = trips.map((trip) => trip._id);
  const vanIds = trips.map((trip) => trip.vanId);
  const driverIds = trips.map((trip) => trip.driverId);

  // Fetch related records in bulk instead of making separate
  // database queries for every trip.
  const [vans, drivers, locations] = await Promise.all([
    Van.find({
      _id: { $in: vanIds },
      schoolId
    })
      .select('_id registrationNumber isActive')
      .lean(),

    User.find({
      _id: { $in: driverIds },
      schoolId,
      role: 'driver'
    })
      .select('_id name isActive')
      .lean(),

    LocationUpdate.find({
      tripId: { $in: tripIds }
    })
      .sort({ receivedAt: -1 })
      .lean()
  ]);

  // Create lookup maps for efficient association.
  const vanMap = new Map(
    vans.map((van) => [String(van._id), van])
  );

  const driverMap = new Map(
    drivers.map((driver) => [String(driver._id), driver])
  );

  // Because locations are sorted newest first, keep only
  // the first location encountered for each trip.
  const latestLocationMap = new Map();

  for (const location of locations) {
    const key = String(location.tripId);

    if (!latestLocationMap.has(key)) {
      latestLocationMap.set(key, location);
    }
  }

  const configuredThreshold = Number(
    process.env.LOCATION_STALE_THRESHOLD_SECONDS ?? 60
  );

  const staleThresholdSeconds =
    Number.isFinite(configuredThreshold) &&
      configuredThreshold >= 0
      ? configuredThreshold
      : 60;

  // Combine trip, van, driver and GPS information.
  return trips.map((trip) => {
    const van = vanMap.get(String(trip.vanId));
    const driver = driverMap.get(String(trip.driverId));
    const latestLocation = latestLocationMap.get(String(trip._id));

    let location = null;

    if (latestLocation) {
      const ageInSeconds = Math.max(
        0,
        Math.floor(
          (Date.now() -
            new Date(latestLocation.receivedAt).getTime()) / 1000
        )
      );

      location = {
        latitude: latestLocation.latitude,
        longitude: latestLocation.longitude,
        recordedAt: latestLocation.recordedAt.toISOString(),
        receivedAt: latestLocation.receivedAt.toISOString(),
        ageInSeconds,
        isStale: ageInSeconds > staleThresholdSeconds
      };
    }

    return {
      trip: {
        id: String(trip._id),
        status: trip.status,
        startedAt: trip.startedAt.toISOString(),
        tripType: trip.tripType ?? null,
        serviceDate: trip.serviceDate ?? null
      },

      van: van
        ? {
          id: String(van._id),
          registrationNumber: van.registrationNumber,
          isActive: van.isActive
        }
        : null,

      driver: driver
        ? {
          id: String(driver._id),
          name: driver.name,
          isActive: driver.isActive
        }
        : null,

      location
    };
  });
}
