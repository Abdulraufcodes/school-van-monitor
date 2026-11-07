import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import { io as createClient } from 'socket.io-client';
import User from '../modules/auth/User.model.js';
import { Trip } from '../modules/trip/trip.model.js';
import Student from '../modules/student/student.model.js';
import { attachSocketServer, emitTripLocationUpdate } from '../src/sockets/socketServer.js';

const parentId = '507f1f77bcf86cd799439016';
const schoolId = '507f1f77bcf86cd799439012';
const tripId = '507f1f77bcf86cd799439014';
const vanId = '507f1f77bcf86cd799439013';
const studentId = '507f1f77bcf86cd799439015';

test('authorized parent receives the saved trip location event', async (t) => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = 'socket-test-secret';
  t.after(() => {
    if (previousSecret === undefined) delete process.env.JWT_ACCESS_SECRET;
    else process.env.JWT_ACCESS_SECRET = previousSecret;
  });

  t.mock.method(User, 'findOne', () => ({
    select() { return this; },
    lean: async () => ({ _id: parentId, schoolId, role: 'parent', isActive: true })
  }));
  t.mock.method(Trip, 'findOne', () => ({
    select() { return this; },
    lean: async () => ({ _id: tripId, schoolId, vanId, status: 'active' })
  }));
  t.mock.method(Student, 'find', () => ({
    select() { return this; },
    lean: async () => [{ _id: studentId }]
  }));

  const server = http.createServer();
  const socketServer = attachSocketServer(server);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(async () => {
    await new Promise((resolve) => socketServer.close(resolve));
  });

  const address = server.address();
  const client = createClient(`http://127.0.0.1:${address.port}`, {
    auth: { token: jwt.sign({ role: 'parent' }, process.env.JWT_ACCESS_SECRET, { subject: parentId }) },
    transports: ['websocket']
  });
  t.after(() => client.disconnect());
  await new Promise((resolve, reject) => {
    client.once('connect', resolve);
    client.once('connect_error', reject);
  });

  const subscription = await new Promise((resolve) => client.emit('trip:subscribe', { tripId }, resolve));
  assert.deepEqual(subscription, { success: true, tripId });

  const eventPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out waiting for location:updated')), 2000);
    client.once('location:updated', (event) => { clearTimeout(timeout); resolve(event); });
  });
  const location = {
    vanId, tripId, latitude: 22.3085, longitude: 73.1827,
    recordedAt: '2026-11-05T04:00:00.000Z', receivedAt: '2026-11-05T04:00:01.000Z'
  };
  emitTripLocationUpdate(location);
  assert.deepEqual(await eventPromise, location);
});
