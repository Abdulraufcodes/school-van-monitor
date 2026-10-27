import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../modules/auth/User.model.js';
import School from '../modules/school/school.model.js';
import { Van } from '../modules/van/van.model.js';

const testPassword = 'auth-test-password-only';
const testSecret = 'auth-test-signing-key-only';
const testUserId = '507f1f77bcf86cd799439011';
const testSchoolId = '507f1f77bcf86cd799439012';
const passwordHash = await bcrypt.hash(testPassword, 4);

function mockLoginUser(t, role, { active = true, email = 'account@example.test' } = {}) {
  const user = {
    _id: testUserId,
    name: 'Test Account',
    email,
    passwordHash,
    role,
    isActive: active,
    schoolId: testSchoolId
  };
  process.env.JWT_ACCESS_SECRET = testSecret;
  t.mock.method(User, 'findOne', () => ({ select: async () => user }));
}

function makeToken(role, { expiresIn = '5m', subject = testUserId } = {}) {
  process.env.JWT_ACCESS_SECRET = testSecret;
  return jwt.sign({ role }, testSecret, { subject, expiresIn });
}

function mockAuthenticatedUser(t, role, { active = true } = {}) {
  const user = {
    _id: testUserId,
    name: 'Test Account',
    email: 'account@example.test',
    role,
    isActive: active,
    schoolId: testSchoolId
  };
  t.mock.method(User, 'findById', () => ({ select: async () => user }));
}

for (const role of ['admin', 'driver', 'parent']) {
  test(`${role} login succeeds and returns a token for the database role`, async (t) => {
    mockLoginUser(t, role);
    const response = await request(app).post('/api/auth/login')
      .send({ email: 'account@example.test', password: testPassword });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.user.role, role);
    const claims = jwt.verify(response.body.data.accessToken, testSecret);
    assert.equal(claims.role, role);
  });
}

test('invalid credentials are rejected with HTTP 401', async (t) => {
  mockLoginUser(t, 'admin');
  const response = await request(app).post('/api/auth/login')
    .send({ email: 'account@example.test', password: 'wrong-test-password' });
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'INVALID_CREDENTIALS');
});

test('inactive accounts are rejected with HTTP 401', async (t) => {
  mockLoginUser(t, 'driver', { active: false });
  const response = await request(app).post('/api/auth/login')
    .send({ email: 'account@example.test', password: testPassword });
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'INVALID_CREDENTIALS');
});

test('login rejects a client supplied role', async (t) => {
  mockLoginUser(t, 'driver');
  const response = await request(app).post('/api/auth/login')
    .send({ email: 'account@example.test', password: testPassword, role: 'admin' });
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
});

test('missing, invalid, and expired bearer tokens are rejected', async (t) => {
  process.env.JWT_ACCESS_SECRET = testSecret;
  const missing = await request(app).get('/api/trips/active');
  const invalid = await request(app).get('/api/trips/active').set('Authorization', 'Bearer not-a-token');
  const expired = await request(app).get('/api/trips/active')
    .set('Authorization', `Bearer ${makeToken('driver', { expiresIn: '-1s' })}`);
  assert.deepEqual([missing.status, invalid.status, expired.status], [401, 401, 401]);
});

test('inactive database user cannot use an otherwise valid token', async (t) => {
  mockAuthenticatedUser(t, 'admin', { active: false });
  const response = await request(app).get('/api/trips/active')
    .set('Authorization', `Bearer ${makeToken('admin')}`);
  assert.equal(response.status, 401);
});

test('current session returns the active database user and role', async (t) => {
  mockAuthenticatedUser(t, 'parent');
  const response = await request(app).get('/api/auth/me')
    .set('Authorization', `Bearer ${makeToken('parent')}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.user, {
    id: testUserId,
    name: 'Test Account',
    email: 'account@example.test',
    role: 'parent',
    schoolId: testSchoolId
  });
});

test('current session rejects missing and invalid tokens', async () => {
  process.env.JWT_ACCESS_SECRET = testSecret;
  const missing = await request(app).get('/api/auth/me');
  const invalid = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid-token');
  assert.deepEqual([missing.status, invalid.status], [401, 401]);
});

test('current session rejects an inactive database account', async (t) => {
  mockAuthenticatedUser(t, 'admin', { active: false });
  const response = await request(app).get('/api/auth/me')
    .set('Authorization', `Bearer ${makeToken('admin')}`);
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'UNAUTHENTICATED');
});

test('current session reports a changed database role instead of the old token role', async (t) => {
  mockAuthenticatedUser(t, 'driver');
  const response = await request(app).get('/api/auth/me')
    .set('Authorization', `Bearer ${makeToken('admin')}`);
  assert.equal(response.status, 200);
  assert.equal(response.body.data.user.role, 'driver');
});

for (const role of ['driver', 'parent']) {
  test(`${role} is denied access to admin-only van APIs`, async (t) => {
    mockAuthenticatedUser(t, role);
    const response = await request(app).get('/api/vans')
      .set('Authorization', `Bearer ${makeToken(role)}`);
    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'FORBIDDEN');
  });
}

test('database role overrides a conflicting role claim for admin authorization', async (t) => {
  mockAuthenticatedUser(t, 'driver');
  const response = await request(app).get('/api/vans')
    .set('Authorization', `Bearer ${makeToken('admin')}`);
  assert.equal(response.status, 403);
});

test('admin can reach the school-scoped van API', async (t) => {
  mockAuthenticatedUser(t, 'admin');
  t.mock.method(School, 'findById', () => ({ select: async () => ({ _id: testSchoolId, isActive: true }) }));
  let queriedSchoolId;
  t.mock.method(Van, 'find', (filter) => {
    queriedSchoolId = filter.schoolId;
    return {
      select() { return this; },
      sort() { return this; },
      lean: async () => []
    };
  });

  const response = await request(app).get('/api/vans')
    .set('Authorization', `Bearer ${makeToken('admin')}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data, []);
  assert.equal(String(queriedSchoolId), testSchoolId);
});

for (const role of ['admin', 'parent']) {
  test(`${role} is denied access to driver-only routes`, async (t) => {
    mockAuthenticatedUser(t, role);
    const response = await request(app).post('/api/vans/507f1f77bcf86cd799439013/location')
      .set('Authorization', `Bearer ${makeToken(role)}`).send({});
    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'FORBIDDEN');
  });
}

test('authenticated driver passes driver role authorization and reaches request validation', async (t) => {
  mockAuthenticatedUser(t, 'driver');
  const response = await request(app).post('/api/vans/507f1f77bcf86cd799439013/location')
    .set('Authorization', `Bearer ${makeToken('driver')}`).send({});
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'VALIDATION_ERROR');
});
