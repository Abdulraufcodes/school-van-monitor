import test from 'node:test';
import assert from 'node:assert/strict';
import { Trip } from '../modules/trip/trip.model.js';
import { Van } from '../modules/van/van.model.js';
import { endTrip, getActiveTrip, startTrip } from '../modules/trip/trip.service.js';

const schoolId = '507f1f77bcf86cd799439012';
const driverId = '507f1f77bcf86cd799439011';
const vanId = '507f1f77bcf86cd799439013';
const tripId = '507f1f77bcf86cd799439014';

function makeTrip(overrides = {}) {
  const timestamp = new Date('2026-01-02T03:04:05.000Z');
  return {
    _id: tripId,
    schoolId,
    vanId,
    driverId,
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
  let createdTrip;
  t.mock.method(Trip, 'create', async (input) => {
    createdTrip = input;
    return makeTrip(input);
  });

  const trip = await startTrip({ vanId, driverId, schoolId });
  assert.equal(createdTrip.status, 'active');
  assert.equal(createdTrip.schoolId, schoolId);
  assert.equal(createdTrip.vanId, vanId);
  assert.equal(createdTrip.driverId, driverId);
  assert.equal(trip.status, 'active');
});

test('startTrip rejects a second active trip for the driver or van', async (t) => {
  t.mock.method(Van, 'findOne', () => ({ lean: async () => ({ _id: vanId, schoolId, assignedDriver: driverId, isActive: true }) }));
  t.mock.method(Trip, 'findOne', () => ({ lean: async () => makeTrip() }));
  await assert.rejects(startTrip({ vanId, driverId, schoolId }), { code: 'ACTIVE_TRIP_EXISTS' });
});

test('startTrip scopes the van lookup to school, assigned driver, and active state', async (t) => {
  let vanFilter;
  t.mock.method(Van, 'findOne', (filter) => {
    vanFilter = filter;
    return { lean: async () => null };
  });

  await assert.rejects(startTrip({ vanId, driverId, schoolId }), { code: 'ASSIGNED_VAN_NOT_FOUND' });
  assert.deepEqual(vanFilter, { _id: vanId, schoolId, assignedDriver: driverId, isActive: true });
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
