import test from 'node:test';
import assert from 'node:assert/strict';
import { api, setAccessToken, setAuthFailureHandler } from './api.js';
import { getAssignedVans, getDrivers } from './driver.service.js';

function useAdapter(t, adapter) {
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = adapter;
  t.after(() => {
    api.defaults.adapter = originalAdapter;
    setAccessToken(null);
    setAuthFailureHandler(null);
  });
}

test('getAssignedVans requests the driver endpoint and preserves active status', async (t) => {
  const vans = [
    { id: 'van-1', registrationNumber: 'BUS-1', isActive: true },
    { id: 'van-2', registrationNumber: 'BUS-2', isActive: false }
  ];
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return {
      data: { success: true, message: 'Assigned vans retrieved successfully', data: vans },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  });

  assert.deepEqual(await getAssignedVans(), vans);
  assert.equal(requestConfig.method, 'get');
  assert.equal(requestConfig.url, '/drivers/me/vans');
  assert.equal(requestConfig.fetchOptions.cache, 'no-store');
});

test('getAssignedVans propagates API errors and rejects malformed responses', async (t) => {
  const error = new Error('Request failed');
  useAdapter(t, async (config) => {
    error.config = config;
    error.response = { status: 503, data: { message: 'Unavailable' }, headers: {}, config };
    throw error;
  });
  await assert.rejects(getAssignedVans(), (caught) => caught === error);

  api.defaults.adapter = async (config) => ({
    data: { success: true, data: null },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  });
  await assert.rejects(getAssignedVans(), /unexpected assigned vans response/);
});

test('getDrivers retrieves only the endpoint response and validates its list shape', async (t) => {
  const drivers = [{ _id: 'driver-1', name: 'Jordan Lee', email: 'jordan@example.test' }];
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, message: 'Drivers retrieved successfully', data: drivers }, status: 200, statusText: 'OK', headers: {}, config };
  });

  assert.deepEqual(await getDrivers(), drivers);
  assert.equal(requestConfig.method, 'get');
  assert.equal(requestConfig.url, '/drivers');
  assert.equal(requestConfig.fetchOptions.cache, 'no-store');

  api.defaults.adapter = async (config) => ({ data: { success: true, data: {} }, status: 200, statusText: 'OK', headers: {}, config });
  await assert.rejects(getDrivers(), /unexpected drivers response/);
});
