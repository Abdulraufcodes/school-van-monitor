import test from 'node:test';
import assert from 'node:assert/strict';

import { getProtectedRouteRedirect, getRoleHomePath } from './roleAccess.js';

const rolePaths = {
  admin: '/dashboard',
  driver: '/driver/dashboard',
  parent: '/parent/dashboard'
};

test('each supported role has its own dashboard route', () => {
  for (const [role, path] of Object.entries(rolePaths)) {
    assert.equal(getRoleHomePath(role), path);
  }
  assert.equal(getRoleHomePath('student'), null);
});

test('unauthenticated direct route access redirects to login', () => {
  for (const role of Object.keys(rolePaths)) {
    assert.equal(getProtectedRouteRedirect({ role }, false, [role]), '/login');
  }
});

test('authenticated users can access only their matching dashboard role', () => {
  for (const userRole of Object.keys(rolePaths)) {
    for (const allowedRole of Object.keys(rolePaths)) {
      assert.equal(
        getProtectedRouteRedirect({ role: userRole }, true, [allowedRole]),
        userRole === allowedRole ? null : rolePaths[userRole],
        `${userRole} access to ${allowedRole} route`
      );
    }
  }
});

test('the admin dashboard remains restricted to admins', () => {
  assert.equal(getProtectedRouteRedirect({ role: 'admin' }, true, ['admin']), null);
  assert.equal(getProtectedRouteRedirect({ role: 'driver' }, true, ['admin']), '/driver/dashboard');
  assert.equal(getProtectedRouteRedirect({ role: 'parent' }, true, ['admin']), '/parent/dashboard');
});

test('admin student audit routes reject driver and parent roles', () => {
  assert.equal(getProtectedRouteRedirect({ role: 'admin' }, true, ['admin']), null);
  assert.equal(getProtectedRouteRedirect({ role: 'driver' }, true, ['admin']), '/driver/dashboard');
  assert.equal(getProtectedRouteRedirect({ role: 'parent' }, true, ['admin']), '/parent/dashboard');
});
