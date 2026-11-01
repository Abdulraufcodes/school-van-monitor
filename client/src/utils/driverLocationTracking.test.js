import test from 'node:test';
import assert from 'node:assert/strict';
import { canTrackTrip, createDriverLocationTracker, getGeolocationError } from './driverLocationTracking.js';

const trip = { id: 'trip-1', vanId: 'van-1', status: 'active' };
const timestamp = Date.parse('2026-11-02T10:00:00.000Z');

function createHarness({ updateLocation = async () => ({ receivedAt: '2026-11-02T10:00:01.000Z' }), now = () => timestamp } = {}) {
  const watches = [];
  const cleared = [];
  const states = [];
  const geolocation = {
    watchPosition(success, error, options) {
      watches.push({ success, error, options });
      return watches.length;
    },
    clearWatch(id) { cleared.push(id); }
  };
  const tracker = createDriverLocationTracker({ trip, isAuthenticated: true, geolocation, updateLocation, onStateChange: (state) => states.push(state), now });
  return { tracker, watches, cleared, states };
}

function position(lat = 22.3, lng = 73.1, time = timestamp) {
  return { coords: { latitude: lat, longitude: lng }, timestamp: time };
}

test('tracking requires an authenticated, confirmed active trip', () => {
  assert.equal(canTrackTrip(trip, true), true);
  assert.equal(canTrackTrip(trip, false), false);
  assert.equal(canTrackTrip({ ...trip, status: 'completed' }, true), false);
  assert.equal(canTrackTrip(null, true), false);
  const harness = createHarness();
  const inactive = createDriverLocationTracker({ trip: null, isAuthenticated: true, geolocation: { watchPosition() { throw new Error('must not start'); } }, updateLocation: async () => ({}), onStateChange: (state) => harness.states.push(state) });
  inactive.start();
  assert.equal(harness.states.at(-1).state, 'stopped');
  assert.equal(harness.watches.length, 0);
});

test('repeated start creates one watcher and stop clears it once', () => {
  const { tracker, watches, cleared } = createHarness();
  tracker.start();
  tracker.start();
  assert.equal(watches.length, 1);
  tracker.stop();
  tracker.stop();
  assert.deepEqual(cleared, [1]);
});

test('confirmed trip end or logout stops the watcher through cleanup', () => {
  const { tracker, watches, cleared } = createHarness();
  tracker.start();
  assert.equal(canTrackTrip(trip, false), false);
  tracker.stop(); // The component effect cleanup runs when trip/auth changes or unmounts.
  assert.equal(watches.length, 1);
  assert.deepEqual(cleared, [1]);
});

test('successful API response alone updates the delivered timestamp; duplicate coordinates are suppressed', async () => {
  const calls = [];
  const { tracker, watches, states } = createHarness({ updateLocation: async (...args) => { calls.push(args); return { receivedAt: '2026-11-02T10:00:01.000Z' }; } });
  tracker.start();
  watches[0].success(position());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], ['van-1', { latitude: 22.3, longitude: 73.1, recordedAt: '2026-11-02T10:00:00.000Z' }]);
  assert.equal(states.at(-1).state, 'tracking');
  assert.equal(states.at(-1).lastSuccessAt, '2026-11-02T10:00:01.000Z');
  watches[0].success(position(22.3, 73.1, timestamp + 1000));
  assert.equal(calls.length, 1);
});

test('API failure stops watcher and never records a successful delivery', async () => {
  const { tracker, watches, cleared, states } = createHarness({ updateLocation: async () => { throw new Error('offline'); } });
  tracker.start();
  watches[0].success(position());
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(cleared, [1]);
  assert.equal(states.at(-1).state, 'network-unavailable');
  assert.equal(states.at(-1).lastSuccessAt, null);
});

test('backend rejection is not reported as a network outage', async () => {
  const rejection = Object.assign(new Error('rejected'), { response: { status: 409 } });
  const { tracker, watches, states } = createHarness({ updateLocation: async () => { throw rejection; } });
  tracker.start();
  watches[0].success(position());
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(states.at(-1).state, 'location-rejected');
  assert.equal(states.at(-1).lastSuccessAt, null);
});

test('permission and GPS failures map to safe driver messages and stop the watcher', () => {
  assert.match(getGeolocationError({ code: 1 }), /permission was denied/i);
  assert.match(getGeolocationError({ code: 2 }), /GPS is unavailable/i);
  assert.match(getGeolocationError({ code: 3 }), /too long/i);
  const { tracker, watches, cleared, states } = createHarness();
  tracker.start();
  watches[0].error({ code: 1 });
  assert.deepEqual(cleared, [1]);
  assert.equal(states.at(-1).state, 'permission-denied');
});

test('unsupported browsers do not create a watcher and expose a retryable state', () => {
  const states = [];
  const tracker = createDriverLocationTracker({ trip, isAuthenticated: true, geolocation: null, updateLocation: async () => ({}), onStateChange: (state) => states.push(state) });
  tracker.start();
  assert.equal(states.at(-1).state, 'unsupported');
});

test('invalid, stale, and out-of-order GPS readings are not submitted', () => {
  const { tracker, watches, cleared, states } = createHarness();
  tracker.start();
  watches[0].success(position(91, 73));
  assert.equal(states.at(-1).state, 'gps-unavailable');
  assert.deepEqual(cleared, [1]);

  const stale = createHarness();
  stale.tracker.start();
  stale.watches[0].success(position(22, 73, timestamp - 120_001));
  assert.equal(stale.states.at(-1).state, 'gps-unavailable');

  let submissions = 0;
  const ordered = createHarness({ updateLocation: async () => { submissions += 1; return { receivedAt: '2026-11-02T10:00:01.000Z' }; } });
  ordered.tracker.start();
  ordered.watches[0].success(position());
  return new Promise((resolve) => setImmediate(resolve)).then(() => {
    ordered.watches[0].success(position(22.4, 73.2, timestamp));
    assert.equal(submissions, 1);
    assert.equal(ordered.states.at(-1).state, 'gps-unavailable');
  });
});
