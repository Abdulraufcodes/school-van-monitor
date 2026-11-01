import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTripStartTime,
  canStartTrip,
  getTripPanelState,
  isVanSelectable,
  tripTypeOptions,
  tryAcquireActionLock
} from './driverDashboard.js';

test('only active assigned vans are selectable', () => {
  assert.equal(isVanSelectable({ isActive: true }), true);
  assert.equal(isVanSelectable({ isActive: false }), false);
  assert.equal(isVanSelectable({}), false);
});

test('trip options use the backend morning and afternoon values', () => {
  assert.deepEqual(tripTypeOptions.map(({ value }) => value), ['morning_pickup', 'afternoon_dropoff']);
});

test('trip panel states prioritize restoration loading and errors', () => {
  assert.equal(getTripPanelState({ loading: true, error: '', trip: null }), 'loading');
  assert.equal(getTripPanelState({ loading: false, error: 'offline', trip: null }), 'error');
  assert.equal(getTripPanelState({ loading: false, error: '', trip: { id: 'trip-1' } }), 'active');
  assert.equal(getTripPanelState({ loading: false, error: '', trip: null }), 'ready');
});

test('Start Trip requires confirmed no-active-trip state, loaded vans, selection, and trip type', () => {
  const ready = { panelState: 'ready', vansLoading: false, vansError: '', selectedVan: { isActive: true }, tripType: 'morning_pickup', action: '' };
  assert.equal(canStartTrip(ready), true);
  assert.equal(canStartTrip({ ...ready, panelState: 'error' }), false);
  assert.equal(canStartTrip({ ...ready, selectedVan: { isActive: false } }), false);
  assert.equal(canStartTrip({ ...ready, vansError: 'HTTP 304' }), false);
  assert.equal(canStartTrip({ ...ready, tripType: '' }), false);
});

test('action lock prevents duplicate actions until released', () => {
  const lock = { current: false };
  assert.equal(tryAcquireActionLock(lock), true);
  assert.equal(tryAcquireActionLock(lock), false);
  lock.current = false;
  assert.equal(tryAcquireActionLock(lock), true);
});

test('trip start time formatter handles missing and invalid values', () => {
  assert.equal(formatTripStartTime(null), 'Unavailable');
  assert.equal(formatTripStartTime('invalid'), 'Unavailable');
  assert.notEqual(formatTripStartTime('2026-10-01T09:00:00.000Z'), 'Unavailable');
});
