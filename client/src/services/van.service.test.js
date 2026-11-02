import test from 'node:test';
import assert from 'node:assert/strict';
import { api, setAccessToken, setAuthFailureHandler } from './api.js';
import { createVan, getVans, updateVanLocation } from './van.service.js';
import { getDrivers } from './driver.service.js';

function useAdapter(t, adapter) {
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = adapter;
  t.after(() => {
    api.defaults.adapter = originalAdapter;
    setAccessToken(null);
    setAuthFailureHandler(null);
  });
}

test('getVans uses the existing API client and returns response data', async (t) => {
  const vans = [{ _id: 'van-1', registrationNumber: 'GJ01AB1234' }];
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, message: 'Vans retrieved successfully', data: vans }, status: 200, statusText: 'OK', headers: {}, config };
  });

  assert.deepEqual(await getVans(), vans);
  assert.equal(requestConfig.method, 'get');
  assert.equal(requestConfig.url, '/vans');
});

test('getDrivers uses the existing API client and returns response data', async (t) => {
  const drivers = [{ _id: 'driver-1', name: 'Driver Name', email: 'driver@example.test' }];
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, message: 'Drivers retrieved successfully', data: drivers }, status: 200, statusText: 'OK', headers: {}, config };
  });

  assert.deepEqual(await getDrivers(), drivers);
  assert.equal(requestConfig.method, 'get');
  assert.equal(requestConfig.url, '/drivers');
});

test('createVan posts only registrationNumber and assignedDriver', async (t) => {
  let requestConfig;
  const created = { id: 'new-van-id', registrationNumber: 'GJ01AB1234' };
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, message: 'Van created successfully', data: created }, status: 201, statusText: 'Created', headers: {}, config };
  });

  const result = await createVan({
    registrationNumber: 'GJ01AB1234',
    assignedDriver: 'driver-user-id',
    schoolId: 'must-not-be-sent',
    extra: 'must-not-be-sent'
  });

  assert.deepEqual(result, created);
  assert.equal(requestConfig.method, 'post');
  assert.equal(requestConfig.url, '/vans');
  assert.deepEqual(JSON.parse(requestConfig.data), {
    registrationNumber: 'GJ01AB1234',
    assignedDriver: 'driver-user-id'
  });
});

test('updateVanLocation posts contract coordinates and device timestamp, then returns confirmed data', async (t) => {
  const payload = { latitude: 22.3, longitude: 73.1, recordedAt: '2026-11-02T10:00:00.000Z' };
  const confirmed = { vanId: 'van-1', tripId: 'trip-1', ...payload, receivedAt: '2026-11-02T10:00:01.000Z' };
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, message: 'Location updated', data: confirmed }, status: 200, statusText: 'OK', headers: {}, config };
  });

  assert.deepEqual(await updateVanLocation('van-1', payload), confirmed);
  assert.equal(requestConfig.method, 'post');
  assert.equal(requestConfig.url, '/vans/van-1/location');
  assert.deepEqual(JSON.parse(requestConfig.data), payload);
});

test('updateVanLocation propagates API errors and rejects unconfirmed response data', async (t) => {
  const error = new Error('Request failed');
  useAdapter(t, async (config) => {
    error.config = config;
    error.response = { status: 409, data: { code: 'STALE_LOCATION_UPDATE' }, headers: {}, config };
    throw error;
  });
  await assert.rejects(updateVanLocation('van-1', { latitude: 1, longitude: 2, recordedAt: '2026-11-02T10:00:00.000Z' }), (caught) => caught === error);

  api.defaults.adapter = async (config) => ({ data: { success: true, data: {} }, status: 200, statusText: 'OK', headers: {}, config });
  await assert.rejects(updateVanLocation('van-1', { latitude: 1, longitude: 2, recordedAt: '2026-11-02T10:00:00.000Z' }), /unexpected location response/);
});

test('service errors propagate from the shared Axios client', async (t) => {
  const error = new Error('Request failed');
  useAdapter(t, async (config) => {
    error.config = config;
    error.response = { status: 409, data: { code: 'VAN_ALREADY_EXISTS', message: 'Van already exists' }, headers: {}, config };
    throw error;
  });

  await assert.rejects(createVan({ registrationNumber: 'GJ01AB1234', assignedDriver: 'driver-user-id' }), (caught) => caught === error);
});

test('list services reject malformed non-array data instead of treating it as empty', async (t) => {
  useAdapter(t, async (config) => ({
    data: { success: true, data: null },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  }));

  await assert.rejects(getVans(), /unexpected vans response/);
  await assert.rejects(getDrivers(), /unexpected drivers response/);
});
