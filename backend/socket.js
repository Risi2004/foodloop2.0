const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('./models/User');
const Donation = require('./models/Donation');
const CustomerOrder = require('./models/CustomerOrder');
const { userCanViewTracking } = require('./utils/donationHelpers');

const DONOR_ROLES = ['donor', 'restaurant', 'supermarket', 'business', 'individual'];
const FOOD_LISTING_ROLES = ['receiver', 'customer'];

function joinFoodListingRoom(socket) {
  if (!socket) return;
  socket.join('receivers');
}

let io = null;

function setIO(socketServer) {
  io = socketServer;
}

function getIO() {
  return io;
}

function emitToReceivers(event, payload) {
  if (!io) return;
  io.to('receivers').emit(event, payload);
}

function emitToDonor(donorId, event, payload) {
  if (!io || !donorId) return;
  io.to(`donor:${donorId}`).emit(event, payload);
}

function emitToDrivers(event, payload) {
  if (!io) return;
  io.to('drivers').emit(event, payload);
}

function emitToDonationRoom(donationId, event, payload) {
  if (!io || !donationId) return;
  io.to(`donation:${donationId}`).emit(event, payload);
}

function emitToCustomer(customerId, event, payload) {
  if (!io || !customerId) return;
  io.to(`customer:${customerId}`).emit(event, payload);
}

function emitToUser(userId, event, payload) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit(event, payload);
}

function attachSocketAuth(socketServer) {
  socketServer.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }
      const secret = process.env.JWT_SECRET;
      const payload = jwt.verify(token, secret);
      const user = await User.findById(payload.sub);
      if (!user) {
        return next(new Error('User not found'));
      }
      if (user.accountStatus === 'deactivated') {
        return next(new Error('Account deactivated'));
      }
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  socketServer.on('connection', (socket) => {
    const role = (socket.user?.role || '').toLowerCase();
    const userId = socket.user?._id?.toString();

    if (userId) {
      socket.join(`user:${userId}`);
    }

    if (FOOD_LISTING_ROLES.includes(role)) {
      joinFoodListingRoom(socket);
    }
    if (role === 'driver') {
      socket.join('drivers');
    }
    if (DONOR_ROLES.includes(role) && userId) {
      socket.join(`donor:${userId}`);
    }
    if (role === 'customer' && userId) {
      socket.join(`customer:${userId}`);
    }

    socket.on('join_food_listings', (payload, callback) => {
      joinFoodListingRoom(socket);
      callback?.({ success: true });
    });

    socket.on('join_donation', async (payload, callback) => {
      try {
        const donationId = payload?.donationId;
        if (!donationId || !mongoose.Types.ObjectId.isValid(donationId)) {
          callback?.({ success: false, message: 'Invalid donation id.' });
          return;
        }

        const customerOrder = await CustomerOrder.findById(donationId);
        if (customerOrder) {
          const customerId =
            customerOrder.customerId?._id?.toString?.() || customerOrder.customerId?.toString?.();
          const driverId =
            customerOrder.driverId?._id?.toString?.() || customerOrder.driverId?.toString?.();
          const viewerId = socket.user._id.toString();
          if (![customerId, driverId].includes(viewerId)) {
            callback?.({ success: false, message: 'Not allowed to join this order room.' });
            return;
          }
          socket.join(`donation:${donationId}`);
          callback?.({ success: true });
          return;
        }

        const donation = await Donation.findById(donationId);
        if (!donation) {
          callback?.({ success: false, message: 'Donation not found.' });
          return;
        }
        if (!userCanViewTracking(donation, socket.user._id)) {
          callback?.({ success: false, message: 'Not allowed to join this donation room.' });
          return;
        }
        socket.join(`donation:${donationId}`);
        callback?.({ success: true });
      } catch (err) {
        callback?.({ success: false, message: err.message || 'Failed to join donation room.' });
      }
    });

    socket.on('leave_donation', (payload) => {
      const donationId = payload?.donationId;
      if (donationId && mongoose.Types.ObjectId.isValid(donationId)) {
        socket.leave(`donation:${donationId}`);
      }
    });
  });
}

module.exports = {
  setIO,
  getIO,
  emitToReceivers,
  emitToDonor,
  emitToDrivers,
  emitToDonationRoom,
  emitToCustomer,
  emitToUser,
  attachSocketAuth,
};
