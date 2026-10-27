import test from 'node:test';
import assert from 'node:assert/strict';
import { clearStoredSession, persistSession, restoreSession } from './authSession.js';

function createStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key)
  };
}

function createSession(role = 'admin', expiresAt = Date.now() + 60_000) {
  const payload = btoa(JSON.stringify({ role, exp: Math.floor(expiresAt / 1000) }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return {
    accessToken: `header.${payload}.signature`,
    user: { id: 'user-id', name: 'Test User', email: 'test@example.test', role }
  };
}

test('login session persists in tab storage and can be restored after refresh', () => {
  const storage = createStorage();
  const session = createSession('driver');
  assert.equal(persistSession(storage, session), true);
  assert.deepEqual(restoreSession(storage), session);
});

test('expired, malformed, or unsupported-role sessions are cleared during restoration', () => {
  const storage = createStorage();
  storage.setItem('schoolVanSession', JSON.stringify(createSession('parent', Date.now() - 60_000)));
  assert.equal(restoreSession(storage), null);
  assert.equal(storage.has('schoolVanSession'), false);

  storage.setItem('schoolVanSession', '{invalid json');
  assert.equal(restoreSession(storage), null);
  assert.equal(storage.has('schoolVanSession'), false);

  assert.equal(persistSession(storage, createSession('student')), false);
});

test('logout clears the stored tab session', () => {
  const storage = createStorage();
  persistSession(storage, createSession());
  clearStoredSession(storage);
  assert.equal(restoreSession(storage), null);
});
