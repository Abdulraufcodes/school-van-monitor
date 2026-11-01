import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { app } from '../src/app.js';
import User from '../modules/auth/User.model.js';
import School from '../modules/school/school.model.js';

const testSecret = 'driver-route-signing-key-only';
const adminId = '507f1f77bcf86cd799439011';
const schoolId = '507f1f77bcf86cd799439012';
const otherSchoolId = '507f1f77bcf86cd799439013';

function makeToken(role, subject = adminId) {
  process.env.JWT_ACCESS_SECRET = testSecret;
  return jwt.sign({ role }, testSecret, { subject, expiresIn: '5m' });
}

function mockAuthenticatedUser(t, role, { userRole = role, userSchoolId = schoolId } = {}) {
  const user = {
    _id: adminId,
    name: 'Test Account',
    email: 'account@example.test',
    role: userRole,
    schoolId: userSchoolId,
    isActive: true
  };

  process.env.JWT_ACCESS_SECRET = testSecret;
  t.mock.method(User, 'findById', () => ({
    select: async () => user
  }));
}

function mockActiveSchool(t) {
  t.mock.method(School, 'findById', () => ({
    select: async () => ({ _id: schoolId, isActive: true })
  }));
}

function mockDriverQuery(t, records) {
  let queryFilter;
  let selectedFields;
  t.mock.method(User, 'find', (filter) => {
    queryFilter = filter;
    return {
      select(fields) {
        selectedFields = fields;
        return this;
      },
      sort() {
        return this;
      },
      lean: async () => records
        .filter((user) =>
          user.role === filter.role &&
          user.isActive === filter.isActive &&
          String(user.schoolId) === String(filter.schoolId)
        )
        .map(({ _id, name, email }) => ({ _id, name, email }))
    };
  });
  return {
    get filter() { return queryFilter; },
    get selectedFields() { return selectedFields; }
  };
}

test('admin receives only active drivers from their own school and only approved fields', async (t) => {
  mockAuthenticatedUser(t, 'admin');
  mockActiveSchool(t);
  const query = mockDriverQuery(t, [
    { _id: 'driver-one', name: 'A Driver', email: 'a@example.test', role: 'driver', isActive: true, schoolId },
    { _id: 'inactive-driver', name: 'Inactive', email: 'inactive@example.test', role: 'driver', isActive: false, schoolId },
    { _id: 'other-school-driver', name: 'Other School', email: 'other@example.test', role: 'driver', isActive: true, schoolId: otherSchoolId },
    { _id: 'parent-user', name: 'Parent', email: 'parent@example.test', role: 'parent', isActive: true, schoolId }
  ]);

  const response = await request(app).get('/api/drivers')
    .set('Authorization', `Bearer ${makeToken('admin')}`);

  assert.equal(response.status, 200);
  assert.equal(response.body.success, true);
  assert.equal(response.body.message, 'Drivers retrieved successfully');
  assert.deepEqual(response.body.data, [
    { _id: 'driver-one', name: 'A Driver', email: 'a@example.test' }
  ]);
  assert.deepEqual(query.filter, { role: 'driver', isActive: true, schoolId });
  assert.equal(query.selectedFields, '_id name email');
  for (const driver of response.body.data) {
    assert.deepEqual(Object.keys(driver).sort(), ['_id', 'email', 'name']);
    assert.equal('passwordHash' in driver, false);
    assert.equal('password' in driver, false);
    assert.equal('phone' in driver, false);
    assert.equal('schoolId' in driver, false);
  }
});

test('admin receives HTTP 200 with an empty array when no drivers match', async (t) => {
  mockAuthenticatedUser(t, 'admin');
  mockActiveSchool(t);
  mockDriverQuery(t, []);

  const response = await request(app).get('/api/drivers')
    .set('Authorization', `Bearer ${makeToken('admin')}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    success: true,
    message: 'Drivers retrieved successfully',
    data: []
  });
});

test('unauthenticated driver-list request is rejected', async () => {
  process.env.JWT_ACCESS_SECRET = testSecret;
  const response = await request(app).get('/api/drivers');
  assert.equal(response.status, 401);
  assert.equal(response.body.code, 'UNAUTHENTICATED');
});

for (const role of ['parent', 'driver']) {
  test(`${role} cannot list school drivers`, async (t) => {
    mockAuthenticatedUser(t, role);
    const response = await request(app).get('/api/drivers')
      .set('Authorization', `Bearer ${makeToken(role)}`);

    assert.equal(response.status, 403);
    assert.equal(response.body.code, 'FORBIDDEN');
  });
}

test('database role overrides a conflicting token role for driver-list authorization', async (t) => {
  mockAuthenticatedUser(t, 'admin', { userRole: 'driver' });
  const response = await request(app).get('/api/drivers')
    .set('Authorization', `Bearer ${makeToken('admin')}`);

  assert.equal(response.status, 403);
  assert.equal(response.body.code, 'FORBIDDEN');
});

test('admin school scope comes from the authenticated user, not request input', async (t) => {
  mockAuthenticatedUser(t, 'admin');
  mockActiveSchool(t);
  const query = mockDriverQuery(t, []);

  const response = await request(app).get(`/api/drivers?schoolId=${otherSchoolId}`)
    .set('Authorization', `Bearer ${makeToken('admin')}`);

  assert.equal(response.status, 200);
  assert.equal(String(query.filter.schoolId), schoolId);
  assert.notEqual(String(query.filter.schoolId), otherSchoolId);
});
