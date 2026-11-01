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

test('admin and driver destinations are enabled while parent destinations stay unchanged', () => {
  assert.deepEqual(roleNavigation.admin.filter(({ comingSoon }) => !comingSoon).map(({ to }) => to), [
    '/dashboard', '/dashboard/vans', '/dashboard/live-tracking', '/dashboard/student-activity', '/dashboard/drivers'
  ]);
  const driverEnabled = roleNavigation.driver.filter(({ comingSoon }) => !comingSoon);
  assert.deepEqual(driverEnabled.map(({ to }) => to), ['/driver/dashboard', '/driver/trip']);
  const parentEnabled = roleNavigation.parent.filter(({ comingSoon }) => !comingSoon);
  assert.deepEqual(parentEnabled.map(({ to }) => to), ['/parent/dashboard']);
});

test('role labels cover all dashboard roles', () => {
  assert.deepEqual(roleLabels, {
    admin: 'Administrator',
    driver: 'Driver',
    parent: 'Parent'
  });
});
