const http = require('http');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const adminRoutes = require('./routes/admin.routes');
const donationRoutes = require('./routes/donation.routes');
const driverRoutes = require('./routes/driver.routes');
const geocodeRoutes = require('./routes/geocode.routes');
const { isR2Configured } = require('./config/r2');
const { setIO, attachSocketAuth } = require('./socket');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

/** Allowed browser origins for CORS and Socket.IO (FRONTEND_URL + optional CORS_ORIGINS). */
function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (raw && String(raw).trim()) {
    return [...new Set(String(raw).split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean))];
  }
  const front = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  return [front];
}

const allowedOrigins = getAllowedOrigins();

function corsOriginCheck(origin, callback) {
  if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
    callback(null, true);
  } else {
    callback(null, false);
  }
}

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
    origin: corsOriginCheck,
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
app.use('/api/donations', donationRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/geocode', geocodeRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const server = http.createServer(app);
const socketServer = new Server(server, {
  cors: {
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    credentials: true,
  },
});
setIO(socketServer);
attachSocketAuth(socketServer);

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log('Socket.IO enabled');
      console.log('CORS origins:', allowedOrigins.join(', '));
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
