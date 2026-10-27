import mongoose from 'mongoose';

export function assertDedicatedTestDatabaseUri(uri) {
  if (typeof uri !== 'string' || !uri.trim()) {
    throw new Error('MONGODB_TEST_URI is required for database integration tests.');
  }

  let target;
  try {
    target = new URL(uri);
  } catch {
    throw new Error('MONGODB_TEST_URI must be a valid MongoDB URL.');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(target.protocol)) {
    throw new Error('MONGODB_TEST_URI must use the MongoDB protocol.');
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(target.pathname.slice(1));
  } catch {
    throw new Error('MONGODB_TEST_URI must include a valid test database name.');
  }

  if (!databaseName || databaseName.includes('/') || !/(?:^|[-_])test$/i.test(databaseName)) {
    throw new Error('MONGODB_TEST_URI must target a database whose name ends in "_test" or "-test".');
  }

  return uri;
}

export async function connectDedicatedTestDatabase() {
  const uri = assertDedicatedTestDatabaseUri(process.env.MONGODB_TEST_URI);
  try {
    await mongoose.connect(uri);
  } catch (error) {
    await mongoose.disconnect().catch(() => {});
    // Do not include the driver error because it may contain the connection URI.
    throw new Error(`Could not connect to the configured test database (${error.name || 'connection error'}).`);
  }
}
