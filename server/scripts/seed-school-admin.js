import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import School from '../modules/school/school.model.js';
import User from '../modules/auth/auth.model.js';

async function seedSchoolAdmin() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed script is disabled in production.');
  }

  const {
    MONGODB_URI,
    SEED_SCHOOL_NAME,
    SEED_SCHOOL_EMAIL,
    SEED_ADMIN_NAME,
    SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD
  } = process.env;

  if (
    !MONGODB_URI ||
    !SEED_SCHOOL_NAME ||
    !SEED_ADMIN_NAME ||
    !SEED_ADMIN_EMAIL ||
    !SEED_ADMIN_PASSWORD
  ) {
    throw new Error(
      'Missing required environment variables. Check your server/.env file.'
    );
  }

  if (SEED_ADMIN_PASSWORD.length < 12) {
    throw new Error('Seed admin password must be at least 12 characters.');
  }

  await mongoose.connect(MONGODB_URI);

  try {
    const schoolEmail = SEED_SCHOOL_EMAIL?.trim().toLowerCase();

    let school = schoolEmail
      ? await School.findOne({ email: schoolEmail })
      : await School.findOne({ name: SEED_SCHOOL_NAME.trim() });

    if (!school) {
      school = await School.create({
        name: SEED_SCHOOL_NAME,
        ...(schoolEmail ? { email: schoolEmail } : {})
      });

      console.log(`Created school: ${school.name}`);
    } else {
      console.log(`Reusing school: ${school.name}`);
    }

    const adminEmail = SEED_ADMIN_EMAIL.trim().toLowerCase();
    let admin = await User.findOne({ email: adminEmail });

    if (admin) {
      if (
        admin.role !== 'admin' ||
        String(admin.schoolId) !== String(school._id)
      ) {
        throw new Error(
          'An account with this email already exists but is not the expected school admin. No changes were made to that account.'
        );
      }

      console.log(`School admin already exists: ${admin.email}`);
    } else {
      const passwordHash = await bcrypt.hash(SEED_ADMIN_PASSWORD, 12);

      admin = await User.create({
        name: SEED_ADMIN_NAME,
        email: adminEmail,
        passwordHash,
        role: 'admin',
        schoolId: school._id,
        isActive: true
      });

      console.log(`Created school admin: ${admin.email}`);
    }

    console.log('School admin seed completed successfully.');
  } finally {
    await mongoose.disconnect();
  }
}

seedSchoolAdmin().catch((error) => {
  console.error('School admin seed failed:', error.message);
  process.exitCode = 1;
});
