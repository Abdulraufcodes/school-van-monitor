import test from 'node:test';
import assert from 'node:assert/strict';

import { assertDedicatedTestDatabaseUri } from '../support/database-guard.js';

test('test database guard accepts only MongoDB URLs with an explicit test database name', () => {
  assert.equal(
    assertDedicatedTestDatabaseUri('mongodb://localhost:27017/school_van_monitor_test'),
    'mongodb://localhost:27017/school_van_monitor_test'
  );
  assert.equal(
    assertDedicatedTestDatabaseUri('mongodb+srv://user:private@cluster.example/school-van-test'),
    'mongodb+srv://user:private@cluster.example/school-van-test'
  );
});

test('test database guard refuses missing URI even if the development URI may be configured', () => {
  assert.throws(() => assertDedicatedTestDatabaseUri(undefined), /MONGODB_TEST_URI is required/);
  assert.throws(() => assertDedicatedTestDatabaseUri(''), /MONGODB_TEST_URI is required/);
});

test('test database guard rejects non-test database names and non-MongoDB protocols', () => {
  assert.throws(
    () => assertDedicatedTestDatabaseUri('mongodb://localhost:27017/school_van_monitor'),
    /ends in "_test" or "-test"/
  );
  assert.throws(
    () => assertDedicatedTestDatabaseUri('https://example.test/school_van_monitor_test'),
    /MongoDB protocol/
  );
});

test('test database guard errors never echo URI credentials', () => {
  const uri = 'mongodb://private-user:secret-value@localhost:27017/production';
  assert.throws(() => assertDedicatedTestDatabaseUri(uri), (error) => {
    assert.equal(error.message.includes('private-user'), false);
    assert.equal(error.message.includes('secret-value'), false);
    return true;
  });
});
