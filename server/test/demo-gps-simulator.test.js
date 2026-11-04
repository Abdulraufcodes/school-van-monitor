import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ROUTE_DURATION_MINUTES,
  DEFAULT_STOP_DURATION_MS,
  DEFAULT_UPDATE_INTERVAL_MS,
  DEMO_VANS,
  MIN_UPDATE_INTERVAL_MS,
  assertSeededDemoRecords,
  buildSimulationPlan,
  distanceMeters,
  getSimulatorConfig,
  nextRecordedAt,
  simulateDemoGps
} from '../scripts/demo-gps-simulator.js';

const registrationNumber = 'CG-DEMO-001';
const school = { _id: 'school-1', name: 'Cedar Grove Community School', email: 'office@cedargrove.example', isActive: true };
const driver = { _id: 'driver-1', email: DEMO_VANS[registrationNumber], role: 'driver', schoolId: school._id, isActive: true };
const van = { _id: 'van-1', registrationNumber, schoolId: school._id, assignedDriver: driver._id, isActive: true };
const trip = { _id: 'trip-1', status: 'active', schoolId: school._id, vanId: van._id, driverId: driver._id };
const target = { school, driver, van, trip, lastRecordedAt: null };
const env = {
  NODE_ENV: 'development',
  DEMO_GPS_SIMULATOR_ENABLED: 'true',
  DEV_DEMO_PASSWORD: 'fictional-demo-password',
  MONGODB_URI: 'mongodb://127.0.0.1:27017/school_van_monitor',
  DEMO_GPS_API_URL: 'http://localhost:5000'
};

function mockResponse(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => ({ success: true, data }) };
}

function demoFetch(calls) {
  return async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).endsWith('/api/auth/login')) return mockResponse({
      accessToken: 'test-token', user: { role: 'driver', email: DEMO_VANS[registrationNumber] }
    });
    if (String(url).endsWith('/api/drivers/me/vans')) return mockResponse([
      { id: van._id, registrationNumber, isActive: true }
    ]);
    if (String(url).endsWith('/api/trips/active')) return mockResponse({ trip: {
      id: trip._id, vanId: van._id, status: 'active'
    } });
    const payload = JSON.parse(options.body);
    return mockResponse({ vanId: van._id, tripId: trip._id, ...payload, receivedAt: payload.recordedAt });
  };
}

test('simulator requires explicit development demo mode', () => {
  assert.throws(() => getSimulatorConfig({ ...env, DEMO_GPS_SIMULATOR_ENABLED: 'false' }, registrationNumber), /DEMO_GPS_SIMULATOR_ENABLED=true/);
  assert.throws(() => getSimulatorConfig({ ...env, NODE_ENV: 'production' }, registrationNumber), /NODE_ENV=development/);
});

test('simulator refuses non-demo vans before loading records or making requests', async () => {
  let loaded = false;
  await assert.rejects(simulateDemoGps({
    env, registrationNumber: 'REAL-VAN-77',
    loadTarget: async () => { loaded = true; },
    fetchImpl: async () => { throw new Error('unexpected request'); }
  }), /Choose one seeded demo van/);
  assert.equal(loaded, false);
});

test('simulator accepts IPv6 loopback and refuses non-local targets', () => {
  const config = getSimulatorConfig({ ...env, DEMO_GPS_API_URL: 'http://[::1]:5000', MONGODB_URI: 'mongodb://[::1]:27017/school_van_monitor' }, registrationNumber);
  assert.equal(config.apiUrl.hostname, '[::1]');
  assert.throws(() => getSimulatorConfig({ ...env, DEMO_GPS_API_URL: 'https://example.com' }, registrationNumber), /local HTTP service/);
  assert.throws(() => getSimulatorConfig({ ...env, MONGODB_URI: 'mongodb+srv://cluster.example/db' }, registrationNumber), /local MongoDB host/);
});

test('simulator refuses vans without an active seeded trip', async () => {
  const calls = [];
  await assert.rejects(simulateDemoGps({
    env, registrationNumber,
    loadTarget: async () => ({ ...target, trip: null }),
    fetchImpl: demoFetch(calls), sleep: async () => {}, log: () => {}
  }), /active seeded demo trip is required/);
  assert.equal(calls.length, 0);
});

test('seeded target validation binds the demo school, driver, van, and active trip', () => {
  assert.equal(assertSeededDemoRecords(target, registrationNumber).van, van);
  assert.throws(() => assertSeededDemoRecords({ ...target, driver: { ...driver, email: 'someone@example.com' } }, registrationNumber), /seeded demo driver/);
  assert.throws(() => assertSeededDemoRecords({ ...target, trip: { ...trip, status: 'completed' } }, registrationNumber), /active trip/);
});

test('default plan creates 40 to 50 points at a roughly seven-second interval', () => {
  const plan = buildSimulationPlan();
  assert.equal(DEFAULT_ROUTE_DURATION_MINUTES, 5);
  assert.equal(DEFAULT_UPDATE_INTERVAL_MS, 7000);
  assert.equal(plan.points.length, 44);
  assert.ok(plan.updateDelayMs >= MIN_UPDATE_INTERVAL_MS);
  assert.ok(plan.updateDelayMs <= DEFAULT_UPDATE_INTERVAL_MS);
});

test('route progresses smoothly at a plausible average van speed', () => {
  const plan = buildSimulationPlan();
  const gaps = plan.points.slice(1).map((point, index) => distanceMeters(plan.points[index], point));
  assert.ok(gaps.every((meters) => meters > 0 && meters < 80));
  assert.ok(plan.averageSpeedKmh >= 15 && plan.averageSpeedKmh <= 40);
  assert.ok(distanceMeters(plan.points[0], plan.points.at(-1)) < 1);
});

test('configuration accepts route, interval, and optional stop settings but rejects unsafe intervals', () => {
  const config = getSimulatorConfig({
    ...env,
    DEMO_GPS_ROUTE_DURATION_MINUTES: '6',
    DEMO_GPS_INTERVAL_MS: '8000',
    DEMO_GPS_STOP_DURATION_MS: '0'
  }, registrationNumber);
  assert.equal(config.routeDurationMinutes, 6);
  assert.equal(config.updateIntervalMs, 8000);
  assert.equal(config.stopDurationMs, 0);
  assert.throws(() => getSimulatorConfig({ ...env, DEMO_GPS_INTERVAL_MS: '2499' }, registrationNumber), /integer between 2500 and 30000/);
  assert.throws(() => getSimulatorConfig({ ...env, DEMO_GPS_ROUTE_DURATION_MINUTES: '2' }, registrationNumber), /integer between 3 and 20/);
  assert.throws(() => getSimulatorConfig({ ...env, DEMO_GPS_STOP_DURATION_MS: '120001' }, registrationNumber), /integer between 0 and 120000/);
});

test('timestamps remain strictly increasing', () => {
  assert.equal(nextRecordedAt(() => 1000, new Date(1000).toISOString()), new Date(1001).toISOString());
  assert.throws(() => nextRecordedAt(() => 1000, new Date(32001).toISOString()), /too far in the future/);
});

test('simulator sends the long route through the existing GPS endpoint and pauses without student events', async () => {
  const calls = [];
  const waits = [];
  let clock = 1_800_000_000_000;
  const logs = [];
  const config = getSimulatorConfig(env, registrationNumber);
  const plan = buildSimulationPlan(config);
  await simulateDemoGps({
    env, registrationNumber,
    loadTarget: async () => target,
    fetchImpl: demoFetch(calls),
    sleep: async (ms) => waits.push(ms),
    now: () => clock++,
    log: (line) => logs.push(line)
  });

  const posts = calls.filter((call) => call.url.includes('/api/vans/') && call.url.endsWith('/location'));
  assert.equal(posts.length, 44);
  assert.ok(posts.every((call) => call.options.method === 'POST'));
  assert.ok(posts.every((call) => call.url === `http://localhost:5000/api/vans/${van._id}/location`));
  assert.ok(posts.every((call) => call.options.headers.authorization === 'Bearer test-token'));
  const payloads = posts.map((call) => JSON.parse(call.options.body));
  const timestamps = payloads.map((point) => Date.parse(point.recordedAt));
  assert.ok(timestamps.every((value, index) => index === 0 || value > timestamps[index - 1]));
  assert.ok(waits.filter((ms) => ms === DEFAULT_STOP_DURATION_MS).length === 3);
  assert.equal(waits.filter((ms) => ms === plan.updateDelayMs).length, plan.points.length - 1);
  assert.ok(Math.abs(waits.reduce((total, ms) => total + ms, 0) - plan.totalDurationMs) < 1);
  assert.equal(calls.some((call) => /student-events|pickup|dropoff/i.test(call.url)), false);
  assert.equal(logs.filter((line) => line.includes('Pausing at route point')).length, 3);
  assert.match(logs.at(-1), /location history remains saved/);
});

test('stop pauses can be disabled', () => {
  const plan = buildSimulationPlan({ stopDurationMs: 0 });
  assert.equal(DEFAULT_STOP_DURATION_MS, 17000);
  assert.equal(plan.stopIndexes.size, 3);
  assert.equal(plan.totalDurationMs, plan.routeDurationMs);
});