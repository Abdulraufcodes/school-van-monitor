import test from 'node:test';
import assert from 'node:assert/strict';
import { filterVans, findAssignedDriver, validateVanForm } from './vanManagement.js';

const vans = [
  { _id: 'van-1', registrationNumber: 'GJ01AB1234', assignedDriver: 'driver-1' },
  { _id: 'van-2', registrationNumber: 'GJ02CD5678', assignedDriver: 'missing-driver' },
  { _id: 'van-3', registrationNumber: 'GJ03EF9012' }
];
const drivers = [
  { _id: 'driver-1', name: 'Avery Morgan', email: 'avery@example.test' }
];

test('driver matching uses assignedDriver and handles missing or unknown references', () => {
  assert.equal(findAssignedDriver(vans[0], drivers), drivers[0]);
  assert.equal(findAssignedDriver(vans[1], drivers), null);
  assert.equal(findAssignedDriver(vans[2], drivers), null);
});

test('van search matches registration, driver name, and driver email case-insensitively', () => {
  assert.deepEqual(filterVans(vans, drivers, 'gj02'), [vans[1]]);
  assert.deepEqual(filterVans(vans, drivers, 'AVERY'), [vans[0]]);
  assert.deepEqual(filterVans(vans, drivers, 'EXAMPLE.TEST'), [vans[0]]);
  assert.deepEqual(filterVans(vans, drivers, '   '), vans);
});

test('van form trims and uppercases registration and validates required fields and length', () => {
  const valid = validateVanForm({ registrationNumber: '  gj01ab1234 ', assignedDriver: 'driver-1' }, drivers);
  assert.deepEqual(valid.errors, {});
  assert.deepEqual(valid.payload, { registrationNumber: 'GJ01AB1234', assignedDriver: 'driver-1' });

  const invalid = validateVanForm({ registrationNumber: ' ', assignedDriver: '' }, drivers);
  assert.equal(invalid.errors.registrationNumber, 'Enter a registration number.');
  assert.equal(invalid.errors.assignedDriver, 'Select an assigned driver.');

  const tooLong = validateVanForm({ registrationNumber: 'R'.repeat(21), assignedDriver: 'driver-1' }, drivers);
  assert.equal(tooLong.errors.registrationNumber, 'Registration number must be 20 characters or fewer.');
});

test('van form rejects driver IDs that were not returned by the driver list', () => {
  const result = validateVanForm({ registrationNumber: 'GJ01AB1234', assignedDriver: 'unknown-driver' }, drivers);
  assert.equal(result.errors.assignedDriver, 'Select an active driver from the list.');
});
