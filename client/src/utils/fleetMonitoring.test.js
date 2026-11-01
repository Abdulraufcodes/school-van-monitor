import test from 'node:test';
import assert from 'node:assert/strict';
import { formatFleetTimestamp, getLocationFreshness, getTripLocationSummary, getTripsWithValidCoordinates, hasValidCoordinates, reconcileSelectedTripId } from './fleetMonitoring.js';

test('trip location summary handles empty trips and null nested records', () => {
  assert.equal(getTripLocationSummary([]), 'empty');
  assert.equal(getTripLocationSummary([{ van: null, driver: null, location: null }]), 'none');
  assert.equal(getTripLocationSummary([{ van: null, driver: null, location: { latitude: 1, longitude: 2 } }]), 'available');
});

test('location freshness uses only the explicit stale flag', () => {
  assert.equal(getLocationFreshness(null), 'Location status unavailable');
  assert.equal(getLocationFreshness({ isStale: true }), 'Stale location');
  assert.equal(getLocationFreshness({ isStale: false }), 'Recent location');
  assert.equal(getLocationFreshness({}), 'Location status unavailable');
});

test('timestamp formatter safely handles missing, invalid, and valid timestamps', () => {
  assert.equal(formatFleetTimestamp(null), 'Time unavailable');
  assert.equal(formatFleetTimestamp('not-a-date'), 'Time unavailable');
  assert.notEqual(formatFleetTimestamp('2026-01-02T03:04:00.000Z'), 'Time unavailable');
});

test('coordinate helpers accept only finite in-range location coordinates', () => {
  assert.equal(hasValidCoordinates({ latitude: 51.5, longitude: -0.1 }), true);
  assert.equal(hasValidCoordinates(null), false);
  assert.equal(hasValidCoordinates({ latitude: 91, longitude: 0 }), false);
  assert.equal(hasValidCoordinates({ latitude: -91, longitude: 0 }), false);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: 181 }), false);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: -181 }), false);
  assert.equal(hasValidCoordinates({ latitude: Number.NaN, longitude: 0 }), false);
  assert.equal(hasValidCoordinates({ latitude: 0, longitude: Number.POSITIVE_INFINITY }), false);
});

test('eligible trip filtering handles missing locations and nullable van or driver records', () => {
  const trips = [
    { trip: { id: 'trip-1' }, van: null, driver: null, location: { latitude: 1, longitude: 2 } },
    { trip: { id: 'trip-2' }, van: null, driver: null, location: null },
    { trip: { id: 'trip-3' }, van: {}, driver: {}, location: { latitude: 100, longitude: 2 } }
  ];
  assert.deepEqual(getTripsWithValidCoordinates(trips), [trips[0]]);
  assert.deepEqual(getTripsWithValidCoordinates(null), []);
});

test('selection is preserved when a trip remains active and cleared when removed', () => {
  const updatedTrips = [{ trip: { id: 'trip-1' }, location: null }];
  assert.equal(reconcileSelectedTripId('trip-1', updatedTrips), 'trip-1');
  assert.equal(reconcileSelectedTripId('trip-2', updatedTrips), null);
  assert.equal(reconcileSelectedTripId(null, updatedTrips), null);
});
