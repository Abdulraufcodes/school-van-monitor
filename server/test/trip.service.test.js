import test from 'node:test';
import assert from 'node:assert/strict';
import { Trip } from '../modules/trip/trip.model.js';
import { Van } from '../modules/van/van.model.js';
import User from '../modules/auth/User.model.js';
import Student from '../modules/student/student.model.js';
import { LocationUpdate } from '../modules/location/location.model.js';
import {
  endTrip,
  getActiveTrip,
  getLatestTripLocation,
  getSchoolActiveTripLocations,
  startTrip
} from '../modules/trip/trip.service.js';
import { getServiceDate } from '../modules/trip/serviceDate.js';

const schoolId = '507f1f77bcf86cd799439012';
const driverId = '507f1f77bcf86cd799439011';
const vanId = '507f1f77bcf86cd799439013';
const tripId = '507f1f77bcf86cd799439014';
const studentId = '507f1f77bcf86cd799439015';

function makeTrip(overrides = {}) {
  const timestamp = new Date('2026-01-02T03:04:05.000Z');
  return {
    _id: tripId,
    schoolId,
    vanId,
    driverId,
    tripType: 'morning_pickup',
    serviceDate: '2026-01-02',
    status: 'active',
    startedAt: timestamp,
    endedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides
  };
}

test('startTrip creates an active trip for the assigned van', async (t) => {
  t.mock.method(Van, 'findOne', () => ({ lean: async () => ({ _id: vanId, schoolId, assignedDriver: driverId, isActive: true }) }));
  t.mock.method(Trip, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Trip, 'exists', async () => null);
  let createdTrip;
  t.mock.method(Trip, 'create', async (input) => {
    createdTrip = input;
    return makeTrip(input);
  });

  const trip = await startTrip({ vanId, tripType: 'morning_pickup', driverId, schoolId });
  assert.equal(createdTrip.status, 'active');
  assert.equal(createdTrip.schoolId, schoolId);
  assert.equal(createdTrip.vanId, vanId);
  assert.equal(createdTrip.driverId, driverId);
  assert.equal(createdTrip.tripType, 'morning_pickup');
  assert.equal(createdTrip.serviceDate, getServiceDate(createdTrip.startedAt));
  assert.equal(trip.tripType, 'morning_pickup');
  assert.equal(trip.status, 'active');
});

test('startTrip rejects a second active trip for the driver or van', async (t) => {
  t.mock.method(Van, 'findOne', () => ({ lean: async () => ({ _id: vanId, schoolId, assignedDriver: driverId, isActive: true }) }));
  t.mock.method(Trip, 'findOne', () => ({ lean: async () => makeTrip() }));
  await assert.rejects(startTrip({ vanId, tripType: 'afternoon_dropoff', driverId, schoolId }), { code: 'ACTIVE_TRIP_EXISTS' });
});

test('startTrip scopes the van lookup to school, assigned driver, and active state', async (t) => {
  let vanFilter;
  t.mock.method(Van, 'findOne', (filter) => {
    vanFilter = filter;
    return { lean: async () => null };
  });

  await assert.rejects(startTrip({ vanId, tripType: 'morning_pickup', driverId, schoolId }), { code: 'ASSIGNED_VAN_NOT_FOUND' });
  assert.deepEqual(vanFilter, { _id: vanId, schoolId, assignedDriver: driverId, isActive: true });
});

test('startTrip supports the morning and afternoon types and rejects an invalid type', async (t) => {
  t.mock.method(Van, 'findOne', () => ({ lean: async () => ({ _id: vanId, schoolId, assignedDriver: driverId, isActive: true }) }));
  t.mock.method(Trip, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Trip, 'exists', async () => null);
  t.mock.method(Trip, 'create', async (input) => makeTrip(input));

  const afternoon = await startTrip({ vanId, tripType: 'afternoon_dropoff', driverId, schoolId });
  assert.equal(afternoon.tripType, 'afternoon_dropoff');
  await assert.rejects(startTrip({ vanId, tripType: 'evening', driverId, schoolId }), { code: 'INVALID_TRIP_TYPE' });
});

test('startTrip rejects a duplicate van, date, and type', async (t) => {
  let duplicateFilter;
  t.mock.method(Van, 'findOne', () => ({ lean: async () => ({ _id: vanId, schoolId, assignedDriver: driverId, isActive: true }) }));
  t.mock.method(Trip, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Trip, 'exists', async (filter) => {
    duplicateFilter = filter;
    return { _id: tripId };
  });

  await assert.rejects(startTrip({ vanId, tripType: 'morning_pickup', driverId, schoolId }), { code: 'TRIP_ALREADY_EXISTS' });
  assert.deepEqual(duplicateFilter, { schoolId, vanId, serviceDate: getServiceDate(), tripType: 'morning_pickup' });
});

test('unique daily trip index handles a concurrent duplicate start', async (t) => {
  t.mock.method(Van, 'findOne', () => ({ lean: async () => ({ _id: vanId, schoolId, assignedDriver: driverId, isActive: true }) }));
  t.mock.method(Trip, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Trip, 'exists', async () => null);
  t.mock.method(Trip, 'create', async () => {
    const error = new Error('duplicate key');
    error.code = 11000;
    error.keyPattern = { schoolId: 1, vanId: 1, serviceDate: 1, tripType: 1 };
    throw error;
  });

  await assert.rejects(startTrip({ vanId, tripType: 'morning_pickup', driverId, schoolId }), { code: 'TRIP_ALREADY_EXISTS' });
});

test('existing active-trip indexes handle concurrent driver starts', async (t) => {
  t.mock.method(Van, 'findOne', () => ({ lean: async () => ({ _id: vanId, schoolId, assignedDriver: driverId, isActive: true }) }));
  t.mock.method(Trip, 'findOne', () => ({ lean: async () => null }));
  t.mock.method(Trip, 'exists', async () => null);
  t.mock.method(Trip, 'create', async () => {
    const error = new Error('duplicate key');
    error.code = 11000;
    error.keyPattern = { driverId: 1 };
    throw error;
  });

  await assert.rejects(startTrip({ vanId, tripType: 'afternoon_dropoff', driverId, schoolId }), { code: 'ACTIVE_TRIP_EXISTS' });
});

test('serviceDate follows the Asia/Kolkata local calendar date', () => {
  assert.equal(getServiceDate(new Date('2026-01-01T20:00:00.000Z')), '2026-01-02');
  assert.equal(getServiceDate(new Date('2026-01-02T00:00:00.000Z')), '2026-01-02');
});

test('getActiveTrip scopes lookup to the authenticated driver and school', async (t) => {
  let tripFilter;
  t.mock.method(Trip, 'findOne', (filter) => {
    tripFilter = filter;
    return { sort() { return this; }, lean: async () => null };
  });

  assert.equal(await getActiveTrip({ driverId, schoolId }), null);
  assert.deepEqual(tripFilter, { driverId, schoolId, status: 'active' });
});

test('endTrip hides trips outside the authenticated driver and school', async (t) => {
  let tripFilter;
  t.mock.method(Trip, 'findOne', async (filter) => {
    tripFilter = filter;
    return null;
  });

  await assert.rejects(endTrip({ tripId, driverId, schoolId }), { code: 'TRIP_NOT_FOUND' });
  assert.deepEqual(tripFilter, { _id: tripId, driverId, schoolId });
});

test('endTrip completes only the active trip for the driver and school', async (t) => {
  let updateFilter;
  let updateValues;
  t.mock.method(Trip, 'findOne', async () => makeTrip());
  t.mock.method(Trip, 'findOneAndUpdate', async (filter, update) => {
    updateFilter = filter;
    updateValues = update.$set;
    return makeTrip({ status: 'completed', endedAt: new Date('2026-01-02T03:05:05.000Z') });
  });

  const trip = await endTrip({ tripId, driverId, schoolId });
  assert.deepEqual(updateFilter, { _id: tripId, driverId, schoolId, status: 'active' });
  assert.equal(updateValues.status, 'completed');
  assert.equal(trip.status, 'completed');
  assert.ok(trip.endedAt);
});

test('admin active locations include trip type and service date', async (t) => {
  const trip = makeTrip({ tripType: 'afternoon_dropoff' });
  t.mock.method(Trip, 'find', () => ({
    sort() { return this; },
    lean: async () => [trip]
  }));
  t.mock.method(Van, 'find', () => ({
    select() { return this; },
    lean: async () => [{ _id: vanId, registrationNumber: 'VAN-1', isActive: true }]
  }));
  t.mock.method(User, 'find', () => ({
    select() { return this; },
    lean: async () => [{ _id: driverId, name: 'Test Driver', isActive: true }]
  }));
  t.mock.method(LocationUpdate, 'find', () => ({
    sort() { return this; },
    lean: async () => []
  }));

  const [item] = await getSchoolActiveTripLocations({ schoolId });
  assert.equal(item.trip.tripType, 'afternoon_dropoff');
  assert.equal(item.trip.serviceDate, '2026-01-02');
});

test('parent trip location includes trip type and service date', async (t) => {
  const timestamp = new Date('2026-01-02T03:04:05.000Z');
  t.mock.method(User, 'findOne', (filter) => ({
    select() { return this; },
    lean: async () => filter.role === 'parent'
      ? { _id: driverId, schoolId }
      : { _id: driverId, name: 'Test Driver' }
  }));
  t.mock.method(Trip, 'findOne', () => ({
    select() { return this; },
    lean: async () => makeTrip({ tripType: 'afternoon_dropoff' })
  }));
  t.mock.method(Student, 'exists', async () => ({ _id: studentId }));
  t.mock.method(Van, 'findOne', () => ({
    select() { return this; },
    lean: async () => ({ _id: vanId, registrationNumber: 'VAN-1' })
  }));
  t.mock.method(LocationUpdate, 'findOne', () => ({
    sort() { return this; },
    lean: async () => ({
      latitude: 12.9,
      longitude: 77.6,
      recordedAt: timestamp,
      receivedAt: timestamp
    })
  }));

  const result = await getLatestTripLocation({
    tripId,
    userId: driverId,
    role: 'parent'
  });
  assert.equal(result.trip.tripType, 'afternoon_dropoff');
  assert.equal(result.trip.serviceDate, '2026-01-02');
});

test('admin active locations expose the newest saved GPS point for a trip', async (t) => {
  const recordedAt = new Date('2026-11-05T04:00:00.000Z');
  const receivedAt = new Date('2026-11-05T04:00:01.000Z');
  t.mock.method(Trip, 'find', () => ({ sort() { return this; }, lean: async () => [makeTrip()] }));
  t.mock.method(Van, 'find', () => ({ select() { return this; }, lean: async () => [
    { _id: vanId, registrationNumber: 'CG-DEMO-001', isActive: true }
  ] }));
  t.mock.method(User, 'find', () => ({ select() { return this; }, lean: async () => [
    { _id: driverId, name: 'Demo Driver', isActive: true }
  ] }));
  t.mock.method(LocationUpdate, 'find', () => ({ sort() { return this; }, lean: async () => [
    { tripId, latitude: 22.3085, longitude: 73.1827, recordedAt, receivedAt }
  ] }));

  const [item] = await getSchoolActiveTripLocations({ schoolId });
  assert.deepEqual(item.location, {
    latitude: 22.3085,
    longitude: 73.1827,
    recordedAt: recordedAt.toISOString(),
    receivedAt: receivedAt.toISOString(),
    ageInSeconds: 0,
    isStale: false
  });
});
