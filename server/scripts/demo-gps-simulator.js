import mongoose from 'mongoose';
import { setTimeout as delay } from 'node:timers/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import User from '../modules/auth/User.model.js';
import School from '../modules/school/school.model.js';
import { LocationUpdate } from '../modules/location/location.model.js';
import { Trip } from '../modules/trip/trip.model.js';
import { Van } from '../modules/van/van.model.js';
import { connectDatabase } from '../src/config/db.js';

export const DEMO_VANS = Object.freeze({
  'CG-DEMO-001': 'driver1@cedargrove.example',
  'CG-DEMO-002': 'driver2@cedargrove.example',
  'CG-DEMO-003': 'driver3@cedargrove.example'
});

export const DEMO_WAYPOINTS = Object.freeze([
  { latitude: 22.3072, longitude: 73.1812 },
  { latitude: 22.3078, longitude: 73.1820 },
  { latitude: 22.3090, longitude: 73.1828 },
  { latitude: 22.3100, longitude: 73.1840 },
  { latitude: 22.3108, longitude: 73.1858 },
  { latitude: 22.3102, longitude: 73.1875 },
  { latitude: 22.3088, longitude: 73.1884 },
  { latitude: 22.3070, longitude: 73.1887 },
  { latitude: 22.3054, longitude: 73.1879 },
  { latitude: 22.3043, longitude: 73.1864 },
  { latitude: 22.3048, longitude: 73.1845 },
  { latitude: 22.3058, longitude: 73.1830 },
  { latitude: 22.3072, longitude: 73.1812 }
]);

export const DEFAULT_ROUTE_DURATION_MINUTES = 5;
export const DEFAULT_UPDATE_INTERVAL_MS = 7000;
export const DEFAULT_STOP_DURATION_MS = 17000;
export const MIN_UPDATE_INTERVAL_MS = 2500;
const MAX_UPDATE_INTERVAL_MS = 30000;
const MIN_ROUTE_DURATION_MINUTES = 3;
const MAX_ROUTE_DURATION_MINUTES = 20;
const MAX_STOP_DURATION_MS = 120000;
const STOP_PROGRESS = Object.freeze([0.25, 0.55, 0.8]);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const normalizedHostname = (hostname) => hostname.toLowerCase().replaceAll('[', '').replaceAll(']', '');
const DEMO_SCHOOL = Object.freeze({
  name: 'Cedar Grove Community School',
  email: 'office@cedargrove.example'
});

function parseLocalUrl(value, label, defaultValue) {
  let url;
  try {
    url = new URL(value || defaultValue);
  } catch {
    throw new Error(`${label} must be a valid local URL.`);
  }
  if (url.protocol !== 'http:' || !LOCAL_HOSTS.has(normalizedHostname(url.hostname))
    || url.username || url.password || url.search || url.hash
    || (label === 'DEMO_GPS_API_URL' && url.pathname !== '/')) {
    throw new Error(`${label} must point to a local HTTP service (localhost, 127.0.0.1, or ::1).`);
  }
  return url;
}

function parseLocalMongoUrl(value) {
  let url;
  try { url = new URL(value || ''); }
  catch { throw new Error('MONGODB_URI must be a valid local MongoDB URL.'); }
  if (!['mongodb:', 'mongodb+srv:'].includes(url.protocol)
    || !LOCAL_HOSTS.has(normalizedHostname(url.hostname))) {
    throw new Error('MONGODB_URI must point to a local MongoDB host (localhost, 127.0.0.1, or ::1).');
  }
  return url;
}

function readIntegerSetting(env, name, fallback, minimum, maximum) {
  const raw = env[name];
  if (raw === undefined || raw === null || String(raw).trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer between ${minimum} and ${maximum}.`);
  }
  return value;
}

export function getSimulatorConfig(env, registrationNumber) {
  if (env.NODE_ENV !== 'development') {
    throw new Error('GPS simulation is available only when NODE_ENV=development.');
  }
  if (env.DEMO_GPS_SIMULATOR_ENABLED !== 'true') {
    throw new Error('Set DEMO_GPS_SIMULATOR_ENABLED=true in server/.env to enable the GPS simulator.');
  }
  const driverEmail = DEMO_VANS[registrationNumber];
  if (!driverEmail) {
    throw new Error('Choose one seeded demo van: CG-DEMO-001, CG-DEMO-002, or CG-DEMO-003.');
  }
  if (!env.DEV_DEMO_PASSWORD || env.DEV_DEMO_PASSWORD.length < 12) {
    throw new Error('DEV_DEMO_PASSWORD must contain the password used by the seeded demo accounts.');
  }
  const dbUrl = parseLocalMongoUrl(env.MONGODB_URI);
  const apiUrl = parseLocalUrl(
    env.DEMO_GPS_API_URL,
    'DEMO_GPS_API_URL',
    `http://127.0.0.1:${env.PORT || '5000'}`
  );
  return {
    registrationNumber,
    driverEmail,
    dbUrl,
    apiUrl,
    routeDurationMinutes: readIntegerSetting(env, 'DEMO_GPS_ROUTE_DURATION_MINUTES', DEFAULT_ROUTE_DURATION_MINUTES, MIN_ROUTE_DURATION_MINUTES, MAX_ROUTE_DURATION_MINUTES),
    updateIntervalMs: readIntegerSetting(env, 'DEMO_GPS_INTERVAL_MS', DEFAULT_UPDATE_INTERVAL_MS, MIN_UPDATE_INTERVAL_MS, MAX_UPDATE_INTERVAL_MS),
    stopDurationMs: readIntegerSetting(env, 'DEMO_GPS_STOP_DURATION_MS', DEFAULT_STOP_DURATION_MS, 0, MAX_STOP_DURATION_MS)
  };
}

export function assertSeededDemoRecords({ school, driver, van, trip }, registrationNumber) {
  const expectedEmail = DEMO_VANS[registrationNumber];
  if (!expectedEmail) throw new Error('The requested van is not in the seeded demo allowlist.');
  if (!school || school.name !== DEMO_SCHOOL.name || school.email !== DEMO_SCHOOL.email || school.isActive !== true) {
    throw new Error('The seeded demo school was not found or does not match the expected fixture.');
  }
  if (!driver || driver.email !== expectedEmail || driver.role !== 'driver'
    || driver.isActive !== true || String(driver.schoolId) !== String(school._id)) {
    throw new Error('The seeded demo driver was not found or does not match this van.');
  }
  if (!van || van.registrationNumber !== registrationNumber || van.isActive !== true
    || String(van.schoolId) !== String(school._id)
    || String(van.assignedDriver) !== String(driver._id)) {
    throw new Error('The van is not the seeded demo van assigned to its expected demo driver.');
  }
  if (!trip || trip.status !== 'active' || String(trip.schoolId) !== String(school._id)
    || String(trip.vanId) !== String(van._id)
    || String(trip.driverId) !== String(driver._id)) {
    throw new Error('Start an active trip for this seeded demo driver and van before simulating GPS.');
  }
  return { school, driver, van, trip };
}

export function nextRecordedAt(now, previousRecordedAt) {
  const nowMs = now();
  const previousMs = previousRecordedAt ? new Date(previousRecordedAt).getTime() : -Infinity;
  if (!Number.isFinite(nowMs) || (previousRecordedAt && !Number.isFinite(previousMs))) {
    throw new Error('Could not determine a valid GPS timestamp.');
  }
  const timestampMs = Math.max(nowMs, previousMs + 1);
  if (timestampMs > nowMs + 30_000) {
    throw new Error('The latest demo GPS timestamp is too far in the future; refusing to send updates.');
  }
  return new Date(timestampMs).toISOString();
}

export function distanceMeters(from, to) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const fromLatitude = radians(from.latitude);
  const toLatitude = radians(to.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function buildSimulationPlan({
  routeDurationMinutes = DEFAULT_ROUTE_DURATION_MINUTES,
  updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS,
  stopDurationMs = DEFAULT_STOP_DURATION_MS
} = {}) {
  const routeDurationMs = routeDurationMinutes * 60_000;
  const intervalCount = Math.ceil(routeDurationMs / updateIntervalMs);
  const updateDelayMs = routeDurationMs / intervalCount;
  if (updateDelayMs < MIN_UPDATE_INTERVAL_MS) {
    throw new Error(`Effective GPS interval cannot be below ${MIN_UPDATE_INTERVAL_MS} ms.`);
  }

  const segmentLengths = DEMO_WAYPOINTS.slice(1).map((point, index) => distanceMeters(DEMO_WAYPOINTS[index], point));
  const routeLengthMeters = segmentLengths.reduce((sum, length) => sum + length, 0);
  const averageSpeedKmh = routeLengthMeters / (routeDurationMs / 1000) * 3.6;
  if (averageSpeedKmh < 4 || averageSpeedKmh > 50) {
    throw new Error('Route duration would produce an implausible van speed; use a duration between 3 and 20 minutes.');
  }

  const points = [];
  let segmentIndex = 0;
  let distanceBeforeSegment = 0;
  for (let pointIndex = 0; pointIndex <= intervalCount; pointIndex += 1) {
    const targetDistance = routeLengthMeters * pointIndex / intervalCount;
    while (segmentIndex < segmentLengths.length - 1
      && targetDistance > distanceBeforeSegment + segmentLengths[segmentIndex]) {
      distanceBeforeSegment += segmentLengths[segmentIndex];
      segmentIndex += 1;
    }
    const segmentLength = segmentLengths[segmentIndex];
    const fraction = segmentLength === 0 ? 0 : (targetDistance - distanceBeforeSegment) / segmentLength;
    const start = DEMO_WAYPOINTS[segmentIndex];
    const end = DEMO_WAYPOINTS[segmentIndex + 1];
    points.push({
      latitude: start.latitude + (end.latitude - start.latitude) * fraction,
      longitude: start.longitude + (end.longitude - start.longitude) * fraction
    });
  }

  const stopIndexes = new Set(STOP_PROGRESS
    .map((progress) => Math.round(intervalCount * progress))
    .filter((index) => index > 0 && index < intervalCount));
  return {
    points,
    routeLengthMeters,
    averageSpeedKmh,
    routeDurationMs,
    updateDelayMs,
    stopDurationMs,
    stopIndexes,
    totalDurationMs: routeDurationMs + stopIndexes.size * stopDurationMs
  };
}

async function loadSeededTarget(registrationNumber) {
  const school = await School.findOne({ email: DEMO_SCHOOL.email }).lean();
  const driverEmail = DEMO_VANS[registrationNumber];
  const driver = school ? await User.findOne({
    email: driverEmail, role: 'driver', schoolId: school._id, isActive: true
  }).lean() : null;
  const van = driver ? await Van.findOne({
    registrationNumber, schoolId: school._id, assignedDriver: driver._id, isActive: true
  }).lean() : null;
  const trip = van ? await Trip.findOne({
    schoolId: school._id, vanId: van._id, driverId: driver._id, status: 'active'
  }).sort({ startedAt: -1 }).lean() : null;
  if (!trip) return assertSeededDemoRecords({ school, driver, van, trip: null }, registrationNumber);
  const latestLocation = await LocationUpdate.findOne({ tripId: trip._id })
    .sort({ recordedAt: -1 }).select('recordedAt').lean();
  return { ...assertSeededDemoRecords({ school, driver, van, trip }, registrationNumber),
    lastRecordedAt: latestLocation?.recordedAt ?? null };
}

async function requestJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, options);
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok || body?.success !== true) {
    const message = body?.message || `Request failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return body.data;
}

async function login(fetchImpl, apiUrl, driverEmail, password) {
  const data = await requestJson(fetchImpl, new URL('/api/auth/login', apiUrl), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: driverEmail, password })
  });
  if (!data?.accessToken || data.user?.role !== 'driver' || data.user?.email !== driverEmail) {
    throw new Error('The local API did not authenticate the expected seeded demo driver.');
  }
  return data.accessToken;
}

async function verifyApiAssignments(fetchImpl, apiUrl, token, target) {
  const headers = { authorization: `Bearer ${token}` };
  const [vans, activeTripResult] = await Promise.all([
    requestJson(fetchImpl, new URL('/api/drivers/me/vans', apiUrl), { headers }),
    requestJson(fetchImpl, new URL('/api/trips/active', apiUrl), { headers })
  ]);
  const apiVan = Array.isArray(vans) ? vans.find((item) => item.registrationNumber === target.van.registrationNumber) : null;
  const activeTrip = activeTripResult?.trip;
  if (!apiVan || apiVan.isActive !== true || String(apiVan.id) !== String(target.van._id)) {
    throw new Error('The API did not confirm the seeded demo van is assigned to this driver.');
  }
  if (!activeTrip || activeTrip.status !== 'active' || String(activeTrip.vanId) !== String(target.van._id)
    || String(activeTrip.id) !== String(target.trip._id)) {
    throw new Error('The API did not confirm an active trip for this seeded demo van.');
  }
  return { vanId: apiVan.id, tripId: activeTrip.id };
}

export async function simulateDemoGps({
  env = process.env,
  registrationNumber,
  fetchImpl = fetch,
  sleep = (ms, options) => delay(ms, undefined, options),
  now = Date.now,
  loadTarget = loadSeededTarget,
  log = console.log,
  signal
}) {
  const config = getSimulatorConfig(env, registrationNumber);
  const plan = buildSimulationPlan(config);
  const target = await loadTarget(registrationNumber);
  if (!target?.trip) throw new Error('An active seeded demo trip is required before starting the simulator.');
  assertSeededDemoRecords(target, registrationNumber);
  const token = await login(fetchImpl, config.apiUrl, config.driverEmail, env.DEV_DEMO_PASSWORD);
  const { vanId, tripId } = await verifyApiAssignments(fetchImpl, config.apiUrl, token, target);

  log(`Simulating ${registrationNumber} on active demo trip ${tripId}: ${plan.points.length} points over about ${Math.round(plan.totalDurationMs / 1000)} seconds. Press Ctrl+C to stop.`);
  let previousRecordedAt = target.lastRecordedAt ?? null;
  for (const [index, point] of plan.points.entries()) {
    if (signal?.aborted) break;
    if (index > 0) await sleep(plan.updateDelayMs, { signal });
    if (signal?.aborted) break;
    const recordedAt = nextRecordedAt(now, previousRecordedAt);
    const saved = await requestJson(fetchImpl, new URL(`/api/vans/${encodeURIComponent(vanId)}/location`, config.apiUrl), {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ...point, recordedAt }),
      signal
    });
    if (String(saved.vanId) !== String(vanId) || String(saved.tripId) !== String(tripId)
      || saved.latitude !== point.latitude || saved.longitude !== point.longitude
      || saved.recordedAt !== recordedAt || !saved.receivedAt) {
      throw new Error('The API did not confirm the expected saved demo GPS update.');
    }
    previousRecordedAt = recordedAt;
    log(`Saved point ${index + 1}/${plan.points.length}: ${point.latitude}, ${point.longitude}`);
    if (plan.stopIndexes.has(index) && plan.stopDurationMs > 0) {
      log(`Pausing at route point ${index + 1} for ${Math.round(plan.stopDurationMs / 1000)} seconds; no student event is created.`);
      await sleep(plan.stopDurationMs, { signal });
    }
  }
  log('Demo GPS route finished. The location history remains saved on this demo trip.');
}

async function main() {
  const registrationNumber = process.argv[2];
  const abortController = new AbortController();
  process.once('SIGINT', () => abortController.abort());
  try {
    getSimulatorConfig(process.env, registrationNumber);
    await connectDatabase();
    await simulateDemoGps({ registrationNumber, signal: abortController.signal });
  } finally {
    await mongoose.disconnect();
  }
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isDirectExecution) {
  main().catch((error) => {
    if (error.name === 'AbortError') console.log('Demo GPS simulation stopped.');
    else {
      console.error(`Demo GPS simulator stopped: ${error.message}`);
      process.exitCode = 1;
    }
  });
}