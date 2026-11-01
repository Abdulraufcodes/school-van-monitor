import test from 'node:test';
import assert from 'node:assert/strict';
import { api, setAccessToken, setAuthFailureHandler } from './api.js';
import { endTrip, getActiveTrip, getAdminActiveTrips, startTrip } from './trip.service.js';

function useAdapter(t, adapter) {
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = adapter;
  t.after(() => {
    api.defaults.adapter = originalAdapter;
    setAccessToken(null);
    setAuthFailureHandler(null);
  });
}

test('getAdminActiveTrips requests the admin locations endpoint and extracts trips', async (t) => {
  const trips = [{ trip: { id: 'trip-1', status: 'active' }, van: null, driver: null, location: null }];
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, message: 'School active trip locations retrieved successfully', data: { trips } }, status: 200, statusText: 'OK', headers: {}, config };
  });

  assert.deepEqual(await getAdminActiveTrips(), trips);
  assert.equal(requestConfig.method, 'get');
  assert.equal(requestConfig.url, '/trips/admin/locations');
  assert.equal(requestConfig.fetchOptions.cache, 'no-store');
});

test('getAdminActiveTrips returns an empty trips array', async (t) => {
  useAdapter(t, async (config) => ({
    data: { success: true, message: 'School active trip locations retrieved successfully', data: { trips: [] } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  }));

  assert.deepEqual(await getAdminActiveTrips(), []);
});

test('getAdminActiveTrips propagates API errors', async (t) => {
  const error = new Error('Request failed');
  useAdapter(t, async (config) => {
    error.config = config;
    error.response = { status: 503, data: { message: 'Service unavailable' }, headers: {}, config };
    throw error;
  });

  await assert.rejects(getAdminActiveTrips(), (caught) => caught === error);
});

test('getAdminActiveTrips rejects an unexpected response shape', async (t) => {
  useAdapter(t, async (config) => ({
    data: { success: true, data: {} },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  }));

  await assert.rejects(getAdminActiveTrips(), /unexpected active trips response/);
});

test('startTrip posts only the selected van and backend trip type', async (t) => {
  const trip = { id: 'trip-1', vanId: 'van-1', tripType: 'afternoon_dropoff' };
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, data: trip }, status: 201, statusText: 'Created', headers: {}, config };
  });

  assert.deepEqual(await startTrip({ vanId: 'van-1', tripType: 'afternoon_dropoff' }), trip);
  assert.equal(requestConfig.method, 'post');
  assert.equal(requestConfig.url, '/trips/start');
  assert.deepEqual(JSON.parse(requestConfig.data), { vanId: 'van-1', tripType: 'afternoon_dropoff' });
});

test('getActiveTrip restores a trip and accepts the no-active-trip response', async (t) => {
  const trip = { id: 'trip-1', tripType: 'morning_pickup' };
  useAdapter(t, async (config) => ({
    data: { success: true, data: { trip } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  }));
  assert.deepEqual(await getActiveTrip(), trip);

  api.defaults.adapter = async (config) => ({
    data: { success: true, data: { trip: null } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  });
  assert.equal(await getActiveTrip(), null);
});

test('endTrip posts to the trip-specific end endpoint', async (t) => {
  const completed = { id: 'trip-1', status: 'completed' };
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, data: completed }, status: 200, statusText: 'OK', headers: {}, config };
  });

  assert.deepEqual(await endTrip('trip-1'), completed);
  assert.equal(requestConfig.method, 'post');
  assert.equal(requestConfig.url, '/trips/trip-1/end');
  assert.equal(requestConfig.data, undefined);
});

test('trip commands propagate API errors and restoration rejects malformed data', async (t) => {
  const error = new Error('Request failed');
  useAdapter(t, async (config) => {
    error.config = config;
    error.response = { status: 409, data: { code: 'ACTIVE_TRIP_EXISTS' }, headers: {}, config };
    throw error;
  });
  await assert.rejects(startTrip({ vanId: 'van-1', tripType: 'morning_pickup' }), (caught) => caught === error);
  await assert.rejects(endTrip('trip-1'), (caught) => caught === error);

  api.defaults.adapter = async (config) => ({
    data: { success: true, data: {} },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  });
  await assert.rejects(getActiveTrip(), /unexpected active trip response/);
});
