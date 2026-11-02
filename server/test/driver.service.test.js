import test from 'node:test';
import assert from 'node:assert/strict';
import { Van } from '../modules/van/van.model.js';
import { listAssignedVans } from '../modules/driver/driver.service.js';

const driverId = '507f1f77bcf86cd799439011';
const schoolId = '507f1f77bcf86cd799439012';

test('listAssignedVans scopes to the driver and school and includes inactive assignments', async (t) => {
  let filter;
  let projection;
  t.mock.method(Van, 'find', (query) => {
    filter = query;
    return {
      select(value) { projection = value; return this; },
      sort() { return this; },
      lean: async () => [
        { _id: '507f1f77bcf86cd799439013', registrationNumber: 'BUS-1', isActive: true },
        { _id: '507f1f77bcf86cd799439014', registrationNumber: 'BUS-2', isActive: false }
      ]
    };
  });

  const vans = await listAssignedVans({ driverId, schoolId });
  assert.deepEqual(filter, { assignedDriver: driverId, schoolId });
  assert.equal(projection, '_id registrationNumber isActive');
  assert.deepEqual(vans, [
    { id: '507f1f77bcf86cd799439013', registrationNumber: 'BUS-1', isActive: true },
    { id: '507f1f77bcf86cd799439014', registrationNumber: 'BUS-2', isActive: false }
  ]);
});

test('listAssignedVans rejects a missing school before querying vans', async () => {
  await assert.rejects(listAssignedVans({ driverId, schoolId: null }), { code: 'SCHOOL_ACCESS_DENIED' });
});
