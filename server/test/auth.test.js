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

test('admin login succeeds and returns an admin token and user', async (t) => {
  stubUserLookup(t, 'admin');

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'account@example.test', password: testPassword });

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.data.user.role, 'admin');
  const claims = jwt.verify(response.body.data.accessToken, testSecret);
  assert.equal(claims.role, 'admin');
});

for (const role of ['driver', 'parent']) {
  test(`${role} login is rejected with HTTP 403`, async (t) => {
    stubUserLookup(t, role);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'account@example.test', password: testPassword });

    assert.equal(response.status, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.code, 'FORBIDDEN');
    assert.equal(response.body.message, 'Admin access required');
  });
}

test('invalid credentials are rejected with HTTP 401', async (t) => {
  stubUserLookup(t, 'admin');

  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'account@example.test', password: 'wrong-test-password' });

  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.equal(response.body.code, 'INVALID_CREDENTIALS');
});
