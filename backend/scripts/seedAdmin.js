/**
 * Seed default admin: email "admin", password "admin123"
 * Run: node scripts/seedAdmin.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const ADMIN_EMAIL = 'admin';
const ADMIN_PASSWORD = 'admin123';

async function seedAdmin() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is missing in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 12);

  const existing = await User.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    existing.password = hashedPassword;
    existing.role = 'Admin';
    existing.accountStatus = 'active';
    existing.isEmailVerified = true;
    existing.username = 'Administrator';
    await existing.save();
    console.log('Updated existing admin user:', ADMIN_EMAIL);
  } else {
    await User.create({
      email: ADMIN_EMAIL,
      password: hashedPassword,
      role: 'Admin',
      contactNo: '0000000000',
      address: 'FoodLoop HQ',
      username: 'Administrator',
      isEmailVerified: true,
      accountStatus: 'active',
    });
    console.log('Created admin user:', ADMIN_EMAIL);
  }

  console.log('Login with email:', ADMIN_EMAIL, '| password:', ADMIN_PASSWORD);
  await mongoose.disconnect();
  process.exit(0);
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
