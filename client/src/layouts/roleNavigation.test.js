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

test('only each role dashboard is enabled until feature screens are implemented', () => {
  for (const [role, items] of Object.entries(roleNavigation)) {
    const enabled = items.filter(({ comingSoon }) => !comingSoon);
    assert.equal(enabled.length, 1, `${role} should have one available destination`);
    assert.equal(enabled[0].to, role === 'admin' ? '/dashboard' : `/${role}/dashboard`);
  }
});

test('role labels cover all dashboard roles', () => {
  assert.deepEqual(roleLabels, {
    admin: 'Administrator',
    driver: 'Driver',
    parent: 'Parent'
  });
});
