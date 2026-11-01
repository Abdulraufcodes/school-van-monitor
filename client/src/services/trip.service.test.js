import test from 'node:test';
import assert from 'node:assert/strict';
import { api, setAccessToken, setAuthFailureHandler } from './api.js';
import { getAdminActiveTrips } from './trip.service.js';

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
