import test from 'node:test';
import assert from 'node:assert/strict';
import { api, setAccessToken, setAuthFailureHandler } from './api.js';

test('API client uses Fetch no-store mode to bypass browser HTTP cache validation', () => {
  assert.deepEqual(api.defaults.adapter, ['fetch', 'xhr', 'http']);
  assert.equal(api.defaults.fetchOptions.cache, 'no-store');
});

function mockStatus(t, status) {
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = async (config) => {
    const error = new Error(`HTTP ${status}`);
    error.config = config;
    error.response = { status, data: {}, headers: {}, config };
    throw error;
  };
  t.after(() => {
    api.defaults.adapter = originalAdapter;
    setAccessToken(null);
    setAuthFailureHandler(null);
  });
}

test('protected API 401 clears the token and notifies the auth context', async (t) => {
  mockStatus(t, 401);
  setAccessToken('test-access-token');
  let failures = 0;
  setAuthFailureHandler(() => { failures += 1; });

  await assert.rejects(api.get('/protected'));
  assert.equal(failures, 1);
  let authorization;
  api.defaults.adapter = async (config) => {
    authorization = config.headers.Authorization;
    return { data: {}, status: 200, statusText: 'OK', headers: {}, config };
  };
  await api.get('/health');
  assert.equal(authorization, undefined);
});

test('login 401 and protected API 403 do not clear the authenticated session', async (t) => {
  mockStatus(t, 401);
  setAccessToken('test-access-token');
  let failures = 0;
  setAuthFailureHandler(() => { failures += 1; });

  await assert.rejects(api.post('/auth/login', { email: 'test@example.test', password: 'wrong' }));
  assert.equal(failures, 0);
  let loginAuthorization;
  api.defaults.adapter = async (config) => {
    loginAuthorization = config.headers.Authorization;
    const error = new Error('HTTP 403');
    error.config = config;
    error.response = { status: 403, data: {}, headers: {}, config };
    throw error;
  };
  await assert.rejects(api.get('/protected'));
  assert.equal(loginAuthorization, 'Bearer test-access-token');
  assert.equal(failures, 0);
});
