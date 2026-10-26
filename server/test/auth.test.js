import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../modules/auth/auth.model.js';

const testPassword = 'auth-test-password-only';
const testSecret = 'auth-test-signing-key-only';
const passwordHash = await bcrypt.hash(testPassword, 4);

function stubUserLookup(t, role, { email = 'account@example.test', active = true } = {}) {
  const user = {
    _id: '507f1f77bcf86cd799439011',
    name: 'Test Account',
    email,
    passwordHash,
    role,
    isActive: active,
    schoolId: '507f1f77bcf86cd799439012'
  };

  process.env.JWT_ACCESS_SECRET = testSecret;
  t.mock.method(User, 'findOne', () => ({
    select: async () => user
  }));
}

for (const role of ['admin', 'driver', 'parent']) {
  test(`${role} login succeeds and returns a token for the database role`, async (t) => {
    stubUserLookup(t, role);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'account@example.test', password: testPassword });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.role, role);
    const claims = jwt.verify(response.body.data.accessToken, testSecret);
    assert.equal(claims.role, role);
  });
}

test('inactive accounts are rejected with HTTP 401', async (t) => {
  stubUserLookup(t, 'driver', { active: false });

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'account@example.test', password: testPassword });

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'INVALID_CREDENTIALS');
});

test('login does not accept a client-selected role', async (t) => {
  stubUserLookup(t, 'driver');

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'account@example.test', password: testPassword, role: 'admin' });

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
});

test('unauthenticated requests cannot access driver-only routes', async () => {
  const response = await request(app)
    .post('/api/vans/507f1f77bcf86cd799439013/location')
    .send({});

  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'UNAUTHENTICATED');
});

for (const role of ['admin', 'parent']) {
  test(`${role} is denied access to the driver-only location route`, async () => {
    process.env.JWT_ACCESS_SECRET = testSecret;
    const token = jwt.sign({ role }, testSecret, {
      subject: '507f1f77bcf86cd799439011',
      expiresIn: '5m'
    });

    const response = await request(app)
      .post('/api/vans/507f1f77bcf86cd799439013/location')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'FORBIDDEN');
  });
}

test('driver token passes role authorization and reaches request validation', async () => {
  process.env.JWT_ACCESS_SECRET = testSecret;
  const token = jwt.sign({ role: 'driver' }, testSecret, {
    subject: '507f1f77bcf86cd799439011',
    expiresIn: '5m'
  });

  const response = await request(app)
    .post('/api/vans/507f1f77bcf86cd799439013/location')
    .set('Authorization', `Bearer ${token}`)
    .send({});

  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
});

test('invalid credentials are rejected with HTTP 401', async (t) => {
  stubUserLookup(t, 'admin');

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'account@example.test', password: 'wrong-test-password' });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'INVALID_CREDENTIALS');
});
