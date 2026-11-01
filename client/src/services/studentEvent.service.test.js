import test from 'node:test';
import assert from 'node:assert/strict';
import { api, setAccessToken, setAuthFailureHandler } from './api.js';
import {
  getStudentTripStatus,
  getAdminStudentEventHistory,
  getTripStudentStatuses,
  requestDropoffOtp,
  requestPickupOtp,
  verifyDropoffOtp,
  verifyPickupOtp
} from './studentEvent.service.js';

const tripId = 'trip-123';
const studentId = 'student-456';

function useAdapter(t, adapter) {
  const originalAdapter = api.defaults.adapter;
  api.defaults.adapter = adapter;
  t.after(() => {
    api.defaults.adapter = originalAdapter;
    setAccessToken(null);
    setAuthFailureHandler(null);
  });
}

test('roster and individual status use the implemented GET endpoints and response shapes', async (t) => {
  const roster = { tripId, tripType: 'morning_pickup', students: [] };
  const status = {
    tripId,
    student: { id: studentId, name: 'Student' },
    pickup: { status: 'pending', occurredAt: null },
    dropoff: { status: 'pending', occurredAt: null }
  };
  const configs = [];
  useAdapter(t, async (config) => {
    configs.push(config);
    return {
      data: { success: true, data: configs.length === 1 ? roster : status },
      status: 200,
      statusText: 'OK',
      headers: {},
      config
    };
  });

  assert.deepEqual(await getTripStudentStatuses(tripId), roster);
  assert.deepEqual(await getStudentTripStatus(tripId, studentId), status);
  assert.deepEqual(configs.map(({ method, url }) => [method, url]), [
    ['get', `/student-events/${tripId}/students`],
    ['get', `/student-events/${tripId}/students/${studentId}/status`]
  ]);
});

test('admin event history uses the per-student route and supported page/limit query', async (t) => {
  const history = {
    student: { id: studentId, name: 'Student' },
    events: [{ id: 'event-1', tripId: 'trip-1', vanId: 'van-1', driverId: 'driver-1', type: 'picked_up', occurredAt: '2026-11-01T08:00:00.000Z' }],
    pagination: { page: 2, limit: 10, total: 12, totalPages: 2 }
  };
  let requestConfig;
  useAdapter(t, async (config) => {
    requestConfig = config;
    return { data: { success: true, message: 'Student event history retrieved successfully', data: history }, status: 200, statusText: 'OK', headers: {}, config };
  });

  assert.deepEqual(await getAdminStudentEventHistory(studentId, { page: 2, limit: 10 }), history);
  assert.equal(requestConfig.method, 'get');
  assert.equal(requestConfig.url, `/student-events/admin/students/${studentId}/history`);
  assert.deepEqual(requestConfig.params, { page: 2, limit: 10 });
});

test('admin history propagates API errors and rejects malformed pagination responses', async (t) => {
  const error = new Error('Request failed');
  useAdapter(t, async (config) => {
    error.config = config;
    error.response = { status: 403, data: { code: 'FORBIDDEN' }, headers: {}, config };
    throw error;
  });
  await assert.rejects(getAdminStudentEventHistory(studentId), (caught) => caught === error);

  api.defaults.adapter = async (config) => ({
    data: { success: true, data: { student: { id: studentId, name: 'Student' }, events: [], pagination: {} } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  });
  await assert.rejects(getAdminStudentEventHistory(studentId), /unexpected student history response/);
});

test('pickup and drop-off OTP calls use their exact paths and request bodies', async (t) => {
  const configs = [];
  useAdapter(t, async (config) => {
    configs.push(config);
    const verification = config.url.endsWith('/verify');
    const type = config.url.includes('/pickup/') ? 'picked_up' : 'dropped_off';
    const data = verification
      ? { id: 'event-id', studentId, tripId, type, occurredAt: '2026-10-01T08:00:00.000Z' }
      : { studentId, expiresInSeconds: 300, resendAvailableInSeconds: 60 };
    return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
  });

  await requestPickupOtp(tripId, studentId);
  await verifyPickupOtp(tripId, studentId, '123456');
  await requestDropoffOtp(tripId, studentId);
  await verifyDropoffOtp(tripId, studentId, '654321');

  assert.deepEqual(configs.map(({ method, url }) => [method, url]), [
    ['post', `/student-events/${tripId}/students/${studentId}/pickup/otp`],
    ['post', `/student-events/${tripId}/students/${studentId}/pickup/verify`],
    ['post', `/student-events/${tripId}/students/${studentId}/dropoff/otp`],
    ['post', `/student-events/${tripId}/students/${studentId}/dropoff/verify`]
  ]);
  assert.deepEqual(JSON.parse(configs[0].data), {});
  assert.deepEqual(JSON.parse(configs[1].data), { otp: '123456' });
  assert.deepEqual(JSON.parse(configs[2].data), {});
  assert.deepEqual(JSON.parse(configs[3].data), { otp: '654321' });
});

test('student-event methods propagate server errors and reject unexpected roster data', async (t) => {
  const error = new Error('Request failed');
  useAdapter(t, async (config) => {
    error.config = config;
    error.response = { status: 429, data: { code: 'OTP_RESEND_COOLDOWN' }, headers: {}, config };
    throw error;
  });
  await assert.rejects(requestPickupOtp(tripId, studentId), (caught) => caught === error);

  api.defaults.adapter = async (config) => ({
    data: { success: true, data: { tripId, students: 'not-an-array' } },
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  });
  await assert.rejects(getTripStudentStatuses(tripId), /unexpected student roster response/);
});
