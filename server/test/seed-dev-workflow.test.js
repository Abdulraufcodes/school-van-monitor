import test from 'node:test';
import assert from 'node:assert/strict';

import { Van } from '../modules/van/van.model.js';
import {
  assertExpectedDemoUser,
  assertExpectedDemoVan
} from '../scripts/seed-dev-workflow.js';

test('seed validation accepts an active demo user with the expected role and school', () => {
  assert.doesNotThrow(() => assertExpectedDemoUser({
    role: 'driver',
    schoolId: 'school-id',
    isActive: true
  }, {
    account: { email: 'driver@example.test', role: 'driver' },
    schoolId: 'school-id'
  }));
});

test('seed validation rejects a demo user with a conflicting role', () => {
  assert.throws(() => assertExpectedDemoUser({
    role: 'admin',
    schoolId: 'school-id',
    isActive: true
  }, {
    account: { email: 'driver@example.test', role: 'driver' },
    schoolId: 'school-id'
  }), /does not match the expected demo role/);
});

test('seed validation accepts a van with the required school and driver associations', () => {
  assert.equal(Van.schema.path('schoolId').isRequired, true);
  const van = new Van({
    registrationNumber: 'CG-DEMO-001',
    schoolId: '507f1f77bcf86cd799439012',
    assignedDriver: '507f1f77bcf86cd799439011',
    isActive: true
  });

  assert.doesNotThrow(() => assertExpectedDemoVan(van, {
    registrationNumber: 'CG-DEMO-001',
    schoolId: '507f1f77bcf86cd799439012',
    assignedDriver: '507f1f77bcf86cd799439011'
  }));
});

test('seed validation rejects a van with a conflicting driver', () => {
  assert.throws(() => assertExpectedDemoVan({
    registrationNumber: 'CG-DEMO-001',
    schoolId: '507f1f77bcf86cd799439012',
    assignedDriver: 'other-driver-id',
    isActive: true
  }, {
    registrationNumber: 'CG-DEMO-001',
    schoolId: '507f1f77bcf86cd799439012',
    assignedDriver: 'expected-driver-id'
  }), /does not match the expected demo school, driver, and active state/);
});

test('seed validation rejects a demo van belonging to a different school', () => {
  assert.throws(() => assertExpectedDemoVan({
    registrationNumber: 'CG-DEMO-001',
    schoolId: 'other-school-id',
    assignedDriver: 'driver-id',
    isActive: true
  }, {
    registrationNumber: 'CG-DEMO-001',
    schoolId: 'school-id',
    assignedDriver: 'driver-id'
  }), /does not match the expected demo school, driver, and active state/);
});
