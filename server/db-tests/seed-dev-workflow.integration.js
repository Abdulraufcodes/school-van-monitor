import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

import User from '../modules/auth/User.model.js';
import School from '../modules/school/school.model.js';
import { Van } from '../modules/van/van.model.js';
import { runSeedWorkflow } from '../scripts/seed-dev-workflow.js';
import { connectDedicatedTestDatabase } from '../support/database-guard.js';

const previousPassword = process.env.DEV_DEMO_PASSWORD;
const testPassword = 'integration-test-password-only';

before(async () => {
  await connectDedicatedTestDatabase();
  process.env.DEV_DEMO_PASSWORD = testPassword;
});

after(async () => {
  if (previousPassword === undefined) delete process.env.DEV_DEMO_PASSWORD;
  else process.env.DEV_DEMO_PASSWORD = previousPassword;
  await mongoose.disconnect();
});

function makeFixture(label) {
  const suffix = `${label}-${new mongoose.Types.ObjectId().toString()}`;
  return {
    schoolDefinition: { name: `Seed Integration ${suffix}`, email: `school-${suffix}@example.test` },
    accounts: [
      { name: 'Integration Admin', email: `admin-${suffix}@example.test`, role: 'admin' },
      { name: 'Integration Driver One', email: `driver1-${suffix}@example.test`, role: 'driver' },
      { name: 'Integration Driver Two', email: `driver2-${suffix}@example.test`, role: 'driver' },
      { name: 'Integration Driver Three', email: `driver3-${suffix}@example.test`, role: 'driver' },
      { name: 'Integration Parent One', email: `parent1-${suffix}@example.test`, role: 'parent' },
      { name: 'Integration Parent Two', email: `parent2-${suffix}@example.test`, role: 'parent' },
      { name: 'Integration Parent Three', email: `parent3-${suffix}@example.test`, role: 'parent' }
    ],
    vanPrefix: `IT-${suffix.replaceAll('-', '').slice(-16).toUpperCase()}`
  };
}

function countRecords() {
  return Promise.all([School.countDocuments(), User.countDocuments(), Van.countDocuments()]);
}

function recordCreated(ids, kind, document) {
  ids[kind].push(document._id);
}

async function removeOwned(ids) {
  const [schoolIds, userIds, vanIds] = [ids.school, ids.user, ids.van];
  if (vanIds.length) await Van.deleteMany({ _id: { $in: vanIds } });
  if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
  if (schoolIds.length) await School.deleteMany({ _id: { $in: schoolIds } });
}

function idsForRun() {
  return { school: [], user: [], van: [] };
}

function captureWrites(ids, failAt) {
  let injected = false;
  return async ({ kind, document }) => {
    recordCreated(ids, kind, document);
    if (!injected && kind === failAt) {
      injected = true;
      throw new Error(`injected failure after ${kind} write`);
    }
  };
}

async function createReusableRecords(config, ids, { existingRoles = config.accounts.map(({ role }) => role) } = {}) {
  const school = await School.create({ ...config.schoolDefinition, isActive: true });
  ids.school.push(school._id);
  const users = [];
  for (const account of config.accounts.filter(({ role }) => existingRoles.includes(role))) {
    const user = await User.create({
      ...account,
      passwordHash: `preserved-hash-${account.role}-${account.email}`,
      schoolId: school._id,
      isActive: true,
      phone: `kept-${account.role}`
    });
    ids.user.push(user._id);
    users.push(user);
  }
  return { school, users };
}

test('seed reruns preserve school, user, and van counts', async (t) => {
  const config = makeFixture('rerun');
  const ids = idsForRun();
  const baseline = await countRecords();
  t.after(() => removeOwned(ids));

  const first = await runSeedWorkflow({ ...config, afterWrite: captureWrites(ids) });
  const afterFirst = await countRecords();
  const second = await runSeedWorkflow({ ...config, afterWrite: captureWrites(ids) });
  const afterSecond = await countRecords();

  assert.deepEqual(afterFirst.map((count, index) => count - baseline[index]), [1, 7, 3]);
  assert.deepEqual(afterSecond, afterFirst);
  assert.equal(first.school._id.toString(), second.school._id.toString());
  assert.deepEqual(first.users.map(({ _id }) => _id.toString()), second.users.map(({ _id }) => _id.toString()));
  assert.deepEqual(first.vans.map(({ _id }) => _id.toString()), second.vans.map(({ _id }) => _id.toString()));
});

test('reused accounts retain IDs, fields, and password hashes', async (t) => {
  const config = makeFixture('preserve');
  const ids = idsForRun();
  const before = await countRecords();
  const { users: existingUsers } = await createReusableRecords(config, ids);
  const expected = existingUsers.map(({ _id, name, email, role, schoolId, isActive, phone, passwordHash }) => ({
    id: _id.toString(), name, email, role, schoolId: schoolId.toString(), isActive, phone, passwordHash
  }));
  t.after(() => removeOwned(ids));

  const result = await runSeedWorkflow({ ...config, afterWrite: captureWrites(ids) });
  const after = await Promise.all(result.users.map(async ({ _id }) => {
    const user = await User.findById(_id).select('+passwordHash');
    return {
      id: user._id.toString(), name: user.name, email: user.email, role: user.role,
      schoolId: user.schoolId.toString(), isActive: user.isActive, phone: user.phone,
      passwordHash: user.passwordHash
    };
  }));

  for (const prior of expected) assert.deepEqual(after.find(({ id }) => id === prior.id), prior);
  assert.deepEqual(await countRecords(), [before[0] + 1, before[1] + 7, before[2] + 3]);
});

test('invalid existing van school, driver, active state, or missing school fails before writes', async (t) => {
  const cases = [
    ['missing school', (van) => { delete van.schoolId; }],
    ['conflicting school', (van) => { van.schoolId = new mongoose.Types.ObjectId(); }],
    ['missing driver', (van) => { delete van.assignedDriver; }],
    ['conflicting driver', (van) => { van.assignedDriver = new mongoose.Types.ObjectId(); }],
    ['missing active state', (van) => { delete van.isActive; }],
    ['inactive', (van) => { van.isActive = false; }]
  ];
  const ids = { van: [] };
  t.after(async () => {
    if (ids.van.length) await Van.deleteMany({ _id: { $in: ids.van } });
  });

  for (const [label, alter] of cases) {
    const config = makeFixture(`invalid-${label.replaceAll(' ', '-')}`);
    const before = await countRecords();
    const registrationNumber = `${config.vanPrefix}-001`;
    const van = {
      registrationNumber,
      schoolId: new mongoose.Types.ObjectId(),
      assignedDriver: new mongoose.Types.ObjectId(),
      isActive: true
    };
    alter(van);
    const created = await Van.collection.insertOne(van);
    ids.van.push(created.insertedId);

    await assert.rejects(runSeedWorkflow({ ...config }), /does not match the expected demo school, driver, and active state/);
    assert.deepEqual(await countRecords(), before, `no seed writes for ${label}`);
  }
});

for (const failurePoint of ['school', 'user', 'van']) {
  test(`failure after ${failurePoint} write removes only records created by that run`, async (t) => {
    const config = makeFixture(`rollback-${failurePoint}`);
    const ids = idsForRun();
    const before = await countRecords();
    t.after(() => removeOwned(ids));

    await assert.rejects(
      runSeedWorkflow({ ...config, afterWrite: captureWrites(ids, failurePoint) }),
      new RegExp(`injected failure after ${failurePoint} write`)
    );
    assert.deepEqual(await countRecords(), before);
    for (const [kind, model] of [['school', School], ['user', User], ['van', Van]]) {
      for (const id of ids[kind]) assert.equal(await model.exists({ _id: id }), null);
    }
  });
}

test('reused school and accounts remain intact when a later user write fails', async (t) => {
  const config = makeFixture('reuse-on-failure');
  const ids = idsForRun();
  const { school, users } = await createReusableRecords(config, ids, { existingRoles: ['admin'] });
  const originalAdmin = await User.findById(users[0]._id).select('+passwordHash');
  const before = await countRecords();
  t.after(() => removeOwned(ids));

  await assert.rejects(
    runSeedWorkflow({ ...config, afterWrite: captureWrites(ids, 'user') }),
    /injected failure after user write/
  );

  const preservedSchool = await School.findById(school._id);
  const preservedAdmin = await User.findById(originalAdmin._id).select('+passwordHash');
  assert.ok(preservedSchool);
  assert.equal(preservedSchool.name, config.schoolDefinition.name);
  assert.ok(preservedAdmin);
  assert.equal(preservedAdmin.passwordHash, originalAdmin.passwordHash);
  assert.equal(preservedAdmin.phone, originalAdmin.phone);
  assert.deepEqual(await countRecords(), before);
});

test('concurrent seed invocation is rejected while the first run owns the lock', async (t) => {
  const config = makeFixture('concurrent');
  const ids = idsForRun();
  const baseline = await countRecords();
  let acquired;
  let continueFirst;
  const lockAcquired = new Promise((resolve) => { acquired = resolve; });
  const holdFirst = new Promise((resolve) => { continueFirst = resolve; });
  t.after(async () => {
    continueFirst();
    await removeOwned(ids);
  });

  const firstRun = runSeedWorkflow({
    ...config,
    afterWrite: async ({ kind, document }) => {
      recordCreated(ids, kind, document);
      if (kind === 'school') {
        acquired();
        await holdFirst;
      }
    }
  });

  await lockAcquired;
  await assert.rejects(runSeedWorkflow({ ...config }), /already running or a previous run left its lock/);
  continueFirst();
  const result = await firstRun;
  assert.equal(await School.countDocuments({ email: config.schoolDefinition.email }), 1);
  assert.deepEqual((await countRecords()).map((count, index) => count - baseline[index]), [1, 7, 3]);
  assert.equal(result.school.email, config.schoolDefinition.email);
});
