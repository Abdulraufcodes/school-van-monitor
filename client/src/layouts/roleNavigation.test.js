import test from 'node:test';
import assert from 'node:assert/strict';
import { roleLabels, roleNavigation } from './roleNavigation.js';

test('dashboard navigation is configured separately for each supported role', () => {
  assert.deepEqual(roleNavigation.admin.map(({ label }) => label), [
    'Overview', 'Vans', 'Live Tracking', 'Students', 'Drivers', 'Parents', 'Reports'
  ]);
  assert.deepEqual(roleNavigation.driver.map(({ label }) => label), [
    'Dashboard', 'My Trip', 'Student Roster', 'Trip History'
  ]);
  assert.deepEqual(roleNavigation.parent.map(({ label }) => label), [
    'Dashboard', 'Live Tracking', 'Activity History'
  ]);
});

test('admin overview, van management, and live tracking are enabled while other role destinations stay unchanged', () => {
  assert.deepEqual(roleNavigation.admin.filter(({ comingSoon }) => !comingSoon).map(({ to }) => to), [
    '/dashboard', '/dashboard/vans', '/dashboard/live-tracking'
  ]);
  for (const role of ['driver', 'parent']) {
    const enabled = roleNavigation[role].filter(({ comingSoon }) => !comingSoon);
    assert.equal(enabled.length, 1, `${role} should keep only its dashboard available`);
    assert.equal(enabled[0].to, `/${role}/dashboard`);
  }
});

test('role labels cover all dashboard roles', () => {
  assert.deepEqual(roleLabels, {
    admin: 'Administrator',
    driver: 'Driver',
    parent: 'Parent'
  });
});
