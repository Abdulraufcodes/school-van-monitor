import mongoose from 'mongoose';

import { Trip } from './trip.model.js';
import { Van } from '../van/van.model.js';
import { AppError } from '../../src/utils/AppError.js';

function requireSchoolId(schoolId) {
  if (!schoolId || !mongoose.isValidObjectId(schoolId)) {
    throw new AppError(
      403,
      'SCHOOL_ACCESS_DENIED',
      'A valid school association is required'
    );
  }
}

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

function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

export async function startTrip({ vanId, driverId, schoolId }) {
  requireSchoolId(schoolId);

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
    // Database indexes protect against simultaneous start requests.
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

export async function getActiveTrip({ driverId, schoolId }) {
  requireSchoolId(schoolId);

  const trip = await Trip.findOne({
    driverId,
    schoolId,
    status: 'active'
  })
    .sort({ startedAt: -1 })
    .lean();

  return trip ? serializeTrip(trip) : null;
}

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
