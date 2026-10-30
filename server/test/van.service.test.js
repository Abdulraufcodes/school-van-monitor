import test from 'node:test';
import assert from 'node:assert/strict';
import { Van } from '../modules/van/van.model.js';
import { Trip } from '../modules/trip/trip.model.js';
import { LocationUpdate } from '../modules/location/location.model.js';
import { updateVanLocation } from '../modules/van/van.service.js';

const schoolId = '507f1f77bcf86cd799439012';
const driverId = '507f1f77bcf86cd799439011';
const vanId = '507f1f77bcf86cd799439013';

const locationRequest = { vanId, driverId, driverSchoolId: schoolId, latitude: 12, longitude: 34 };

function mockVan(t, van) {
  t.mock.method(Van, 'findById', () => ({ lean: async () => van }));
}

test('location update rejects a van from another school', async (t) => {
  mockVan(t, { _id: vanId, schoolId: '507f1f77bcf86cd799439099', assignedDriver: driverId, isActive: true });
  await assert.rejects(updateVanLocation(locationRequest), { code: 'FORBIDDEN' });
});

test('location update rejects a van assigned to another driver', async (t) => {
  mockVan(t, { _id: vanId, schoolId, assignedDriver: '507f1f77bcf86cd799439099', isActive: true });
  await assert.rejects(updateVanLocation(locationRequest), { code: 'FORBIDDEN' });
});

test('location update requires an active trip scoped to school, van, and driver', async (t) => {
  mockVan(t, { _id: vanId, schoolId, assignedDriver: driverId, isActive: true });
  let tripFilter;
  let locationCreated = false;
  t.mock.method(Trip, 'findOne', (filter) => {
    tripFilter = filter;
    return { sort() { return this; }, lean: async () => null };
  });
  t.mock.method(LocationUpdate, 'create', async () => { locationCreated = true; });

  await assert.rejects(updateVanLocation(locationRequest), { code: 'NO_ACTIVE_TRIP' });
  assert.deepEqual(tripFilter, { schoolId, vanId, driverId, status: 'active' });
  assert.equal(locationCreated, false);
});

test('location update records against the authenticated school trip', async (t) => {
  mockVan(t, { _id: vanId, schoolId, assignedDriver: driverId, isActive: true });
  let tripFilter;
  let locationInput;
  const now = new Date();
  t.mock.method(Trip, 'findOne', (filter) => {
    tripFilter = filter;
    return { sort() { return this; }, lean: async () => ({ _id: '507f1f77bcf86cd799439014' }) };
  });

  // No previous location exists for this trip.
  t.mock.method(LocationUpdate, 'findOne', () => ({
    sort() {
      return this;
    },
    select() {
      return this;
    },
    lean: async () => null
  }));
  
  t.mock.method(LocationUpdate, 'create', async (input) => {
    locationInput = input;
    return { ...input };
  });

  const result = await updateVanLocation({ ...locationRequest, recordedAt: now.toISOString() });
  assert.deepEqual(tripFilter, { schoolId, vanId, driverId, status: 'active' });
  assert.equal(String(locationInput.vanId), vanId);
  assert.equal(String(locationInput.tripId), '507f1f77bcf86cd799439014');
  assert.equal(String(locationInput.driverId), driverId);
  assert.equal(result.latitude, 12);
  assert.equal(result.longitude, 34);
});
