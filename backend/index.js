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
const routingRoutes = require('./routes/routing.routes');
const paymentRoutes = require('./routes/payment.routes');
const customerOrderRoutes = require('./routes/customerOrder.routes');
const weatherRoutes = require('./routes/weather.routes');
const earningsRoutes = require('./routes/earnings.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const chatRoutes = require('./routes/chat.routes');
const supplierAiRoutes = require('./routes/supplierAi.routes');
const supplierEsgRoutes = require('./routes/supplierEsg.routes');
const supplierBundleRoutes = require('./routes/supplierBundle.routes');
const mapRoutes = require('./routes/map.routes');
const contactRoutes = require('./routes/contact.routes');
const statsRoutes = require('./routes/stats.routes');
const notificationRoutes = require('./routes/notification.routes');
const reviewRoutes = require('./routes/review.routes');
const { isIndexAvailable } = require('./services/chatKnowledgeIndex');
const { isR2Configured } = require('./config/r2');
const { setIO, attachSocketAuth } = require('./socket');
const { startRenewalScheduler } = require('./services/supplierSubscriptionRenewalScheduler');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

/** Explicit allowlist: FRONTEND_URL plus any comma-separated CORS_ORIGINS. */
function getAllowedOrigins() {
  const set = new Set();
  const front = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  set.add(front);
  const raw = process.env.CORS_ORIGINS;
  if (raw && String(raw).trim()) {
    String(raw)
      .split(',')
      .map((s) => s.trim().replace(/\/$/, ''))
      .filter(Boolean)
      .forEach((o) => set.add(o));
  }
  return [...set];
}

const allowedOrigins = getAllowedOrigins();

/** Vercel preview URLs change per deploy; allow https://*.vercel.app unless disabled. */
function isVercelPreviewAllowed() {
  return process.env.ALLOW_VERCEL_PREVIEWS !== 'false';
}

function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;
  if (!isVercelPreviewAllowed()) return false;
  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'https:' && hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function corsOriginCheck(origin, callback) {
  callback(null, isOriginAllowed(origin));
}

function socketCorsOrigin(origin, callback) {
  if (isOriginAllowed(origin)) {
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

// Serve local uploads (profile images saved locally when R2 is not configured)
const legacyUploadsRoot = path.join(__dirname, 'uploads');
if (!fs.existsSync(legacyUploadsRoot)) {
  fs.mkdirSync(legacyUploadsRoot, { recursive: true });
}
app.use('/uploads', express.static(legacyUploadsRoot));

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
app.use('/api/map', mapRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/customer-orders', customerOrderRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/supplier/ai-insights', supplierAiRoutes);
app.use('/api/supplier/esg', supplierEsgRoutes);
app.use('/api/supplier/bundle', supplierBundleRoutes);

if (!isIndexAvailable()) {
  console.warn(
    'Warning: Chat knowledge index missing. Run "npm run chat:ingest" in backend/ after adding knowledge files.'
  );
}

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
    origin: socketCorsOrigin,
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
      startRenewalScheduler();
      console.log('Socket.IO enabled');
      console.log('CORS allowlist:', allowedOrigins.join(', '));
      console.log(
        'CORS Vercel previews:',
        isVercelPreviewAllowed() ? 'enabled (*.vercel.app)' : 'disabled'
      );
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
