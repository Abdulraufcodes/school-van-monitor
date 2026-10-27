import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { config as loadEnv } from 'dotenv';

import { connectDatabase } from '../src/config/db.js';
import User from '../modules/auth/User.model.js';
import School from '../modules/school/school.model.js';
import { Van } from '../modules/van/van.model.js';

const demoSchool = {
  name: 'Cedar Grove Community School',
  email: 'office@cedargrove.example'
};

const demoAccounts = [
  { name: 'Avery Morgan', email: 'admin@cedargrove.example', role: 'admin' },
  { name: 'Jordan Lee', email: 'driver1@cedargrove.example', role: 'driver' },
  { name: 'Casey Patel', email: 'driver2@cedargrove.example', role: 'driver' },
  { name: 'Riley Chen', email: 'driver3@cedargrove.example', role: 'driver' },
  { name: 'Taylor Brooks', email: 'parent1@cedargrove.example', role: 'parent' },
  { name: 'Morgan Diaz', email: 'parent2@cedargrove.example', role: 'parent' },
  { name: 'Jamie Wilson', email: 'parent3@cedargrove.example', role: 'parent' }
];

export function assertDevelopmentTarget() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Refusing to seed: NODE_ENV must be explicitly set to development.');
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required.');

  let target;
  try {
    target = new URL(uri);
  } catch {
    throw new Error('MONGODB_URI is not a valid MongoDB URL.');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(target.protocol)) {
    throw new Error('Refusing to seed: MONGODB_URI must use the MongoDB protocol.');
  }

  const host = target.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error('Refusing to seed a non-local MongoDB host. Use a local development database.');
  }

  const password = process.env.DEV_DEMO_PASSWORD;
  if (!password || password.length < 12) {
    throw new Error('DEV_DEMO_PASSWORD is required and must be at least 12 characters.');
  }
}

export function assertExpectedDemoUser(user, { account, schoolId }) {
  if (
    !user ||
    user.role !== account.role ||
    String(user.schoolId) !== String(schoolId) ||
    user.isActive !== true
  ) {
    throw new Error(`Existing account ${account.email} does not match the expected demo role, school, and active state.`);
  }
}

export function assertExpectedDemoVan(van, { registrationNumber, schoolId, assignedDriver }) {
  if (
    !van ||
    van.registrationNumber !== registrationNumber ||
    String(van.schoolId) !== String(schoolId) ||
    String(van.assignedDriver) !== String(assignedDriver) ||
    van.isActive !== true
  ) {
    throw new Error(`Existing van ${registrationNumber} does not match the expected demo school, driver, and active state.`);
  }
}

async function findOrPlanSchool(schoolDefinition) {
  let school = await School.findOne({ email: schoolDefinition.email });
  if (!school) school = await School.findOne({ name: schoolDefinition.name });

  if (school) {
    if (school.name !== schoolDefinition.name) {
      throw new Error('The demo school email is already associated with a different school. No records were changed.');
    }
    if (school.email && school.email.toLowerCase() !== schoolDefinition.email) {
      throw new Error('A school with the demo name has a different email. No records were changed.');
    }
    return { school, created: false };
  }

  school = new School({ ...schoolDefinition, isActive: true });
  return { school, created: true };
}

async function planDemoUsers({ schoolId, passwordHash, accounts: accountDefinitions }) {
  const plans = [];
  for (const account of accountDefinitions) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      assertExpectedDemoUser(existing, { account, schoolId });
      plans.push({ user: existing, created: false });
      continue;
    }

    plans.push({
      user: new User({
        name: account.name,
        email: account.email,
        passwordHash,
        role: account.role,
        schoolId,
        isActive: true
      }),
      created: true
    });
  }
  return plans;
}

async function planDemoVans(drivers, schoolId, vanPrefix) {
  const plans = [];
  for (const [index, driver] of drivers.entries()) {
    const registrationNumber = `${vanPrefix}-${String(index + 1).padStart(3, '0')}`;
    const existing = await Van.findOne({ registrationNumber }).lean();
    if (existing) {
      assertExpectedDemoVan(existing, { registrationNumber, schoolId, assignedDriver: driver._id });
      plans.push({ van: existing, created: false });
      continue;
    }

    plans.push({
      van: new Van({ registrationNumber, schoolId, assignedDriver: driver._id, isActive: true }),
      created: true
    });
  }
  return plans;
}

async function rollbackCreatedRecords(created) {
  const failures = [];
  for (const { model, document, identity } of [...created].reverse()) {
    try {
      await model.deleteOne({ _id: document._id, ...identity });
    } catch (error) {
      failures.push(`${model.modelName} ${document._id}: ${error.message}`);
    }
  }
  if (failures.length) {
    throw new Error(`Rollback could not remove every record created by this run: ${failures.join('; ')}`);
  }
}

async function acquireSeedLock() {
  const collection = mongoose.connection.db.collection('seed_locks');
  const owner = randomUUID();
  try {
    await collection.insertOne({
      _id: 'seed-dev-workflow',
      owner,
      acquiredAt: new Date()
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new Error('The development seed is already running or a previous run left its lock. Verify no seed process is active before removing the lock.');
    }
    throw error;
  }
  return async () => {
    const result = await collection.deleteOne({ _id: 'seed-dev-workflow', owner });
    if (result.deletedCount !== 1) throw new Error('The development seed lock could not be released by its owner.');
  };
}

export async function runSeedWorkflow({
  schoolDefinition = demoSchool,
  accounts = demoAccounts,
  vanPrefix = 'CG-DEMO',
  afterWrite = async () => {}
} = {}) {
  const releaseLock = await acquireSeedLock();

  const created = [];
  try {
    const { school, created: schoolCreated } = await findOrPlanSchool(schoolDefinition);
    const passwordHash = await bcrypt.hash(process.env.DEV_DEMO_PASSWORD, 12);
    const userPlans = await planDemoUsers({ schoolId: school._id, passwordHash, accounts });
    const driverUsers = userPlans
      .filter(({ user }) => user.role === 'driver')
      .map(({ user }) => user);
    const vanPlans = await planDemoVans(driverUsers, school._id, vanPrefix);

    // Validate the full intended set before the first write. MongoDB standalone
    // development servers do not support multi-document transactions, so on a
    // later write failure only records created in this run are removed by _id
    // plus their identifying fields. Reused records are never deleted.
    if (schoolCreated) {
      created.push({ model: School, document: school, identity: { name: schoolDefinition.name, email: schoolDefinition.email } });
      await school.save();
      await afterWrite({ kind: 'school', document: school });
    }

    for (const plan of userPlans) {
      if (plan.created) {
        created.push({ model: User, document: plan.user, identity: { email: plan.user.email, role: plan.user.role } });
        await plan.user.save();
        await afterWrite({ kind: 'user', document: plan.user });
      }
      console.log(`${plan.created ? 'Created' : 'Reused'} demo ${plan.user.role} account: ${plan.user.email}`);
    }

    let vansCreated = 0;
    for (const plan of vanPlans) {
      if (plan.created) {
        created.push({ model: Van, document: plan.van, identity: { registrationNumber: plan.van.registrationNumber, schoolId: plan.van.schoolId, assignedDriver: plan.van.assignedDriver } });
        await plan.van.save();
        await afterWrite({ kind: 'van', document: plan.van });
        vansCreated += 1;
      }
    }

    console.log(`${schoolCreated ? 'Created' : 'Reused'} demo school: ${school.name}`);
    console.log(`Development seed complete: 1 school, ${userPlans.length} users, ${vansCreated} new vans.`);
    console.log('Existing accounts and vans were not overwritten.');
    return { school, users: userPlans.map(({ user }) => user), vans: vanPlans.map(({ van }) => van) };
  } catch (error) {
    try {
      await rollbackCreatedRecords(created);
    } catch (rollbackError) {
      throw new Error(`${error.message}. ${rollbackError.message}`);
    }
    throw error;
  } finally {
    await releaseLock();
  }
}

async function seedDevelopmentWorkflow() {
  assertDevelopmentTarget();
  await connectDatabase();
  return runSeedWorkflow();
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  loadEnv();
  seedDevelopmentWorkflow()
    .catch((error) => {
      console.error(`Development seed failed: ${error.message}`);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect().catch(() => {});
    });
}
