const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const { isR2Configured } = require('./config/r2');

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('MONGO_URI is required. Set it in backend/.env');
  process.exit(1);
}

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is required. Set it in backend/.env');
  process.exit(1);
}

app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());

// Legacy local uploads (accounts created before R2 migration)
const legacyUploadsRoot = path.join(__dirname, 'uploads');
if (fs.existsSync(legacyUploadsRoot)) {
  app.use('/uploads', express.static(legacyUploadsRoot));
}

if (!isR2Configured()) {
  console.warn(
    'Warning: Cloudflare R2 is not fully configured. Signup file uploads will fail until R2_* env vars are set.'
  );
}

app.get('/', (req, res) => {
  res.send('FoodLoop 2.0 API is running...');
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
