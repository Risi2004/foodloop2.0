import { io } from 'socket.io-client';
import { getToken } from '../utils/auth';

const MAX_RECEIVER_RADIUS_KM = 25;
const MAX_DRIVER_RADIUS_KM = 40;

let socket = null;

function getSocketUrl() {
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (apiBase) return apiBase;

  // In Vite dev (localhost:5173), connect directly to backend socket server
  // to avoid noisy websocket proxy abort errors from the dev proxy.
  if (window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:5000';
  }

  return window.location.origin;
}

export function getSocket() {
  const token = getToken();
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket?.connected && socket.auth?.token === token) {
    return socket;
  }

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(getSocketUrl(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect_error:', err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

function subscribe(event, handler) {
  const s = getSocket();
  if (!s) return () => {};
  s.on(event, handler);
  return () => {
    s.off(event, handler);
  };
}

export function joinDonation(donationId) {
  return new Promise((resolve) => {
    const s = getSocket();
    if (!s || !donationId) {
      resolve({ success: false, message: 'Socket not connected' });
      return;
    }
    s.emit('join_donation', { donationId }, (response) => {
      resolve(response || { success: true });
    });
    setTimeout(() => resolve({ success: true }), 3000);
  });
}

export function leaveDonation(donationId) {
  const s = getSocket();
  if (s && donationId) {
    s.emit('leave_donation', { donationId });
  }
}

export function onDonationPickedUp(handler) {
  return subscribe('donation:picked_up', handler);
}

export function onDriverLocation(handler) {
  return subscribe('driver:location', handler);
}

export function onDonationCreated(handler) {
  return subscribe('donation:created', handler);
}

export function onDonationClaimed(handler) {
  return subscribe('donation:claimed', handler);
}

export function onDonationStockUpdated(handler) {
  return subscribe('donation:stockUpdated', handler);
}

export function onDonationClaimedForDonor(handler) {
  return subscribe('donation:claimedForDonor', handler);
}

export function onDonationCancelled(handler) {
  return subscribe('donation:cancelled', handler);
}

export function onDonationNewPickup(handler) {
  return subscribe('donation:newPickup', handler);
}

export function onDonationPickupTaken(handler) {
  return subscribe('donation:pickupTaken', handler);
}

export function onDonationClaimCancelled(handler) {
  return subscribe('donation:claimCancelled', handler);
}

export function onDonationClaimCancelledForDonor(handler) {
  return subscribe('donation:claimCancelledForDonor', handler);
}

export function onDonationInTransit(handler) {
  return subscribe('donation:in_transit', handler);
}

export function onDeliveryConfirmed(handler) {
  return subscribe('donation:delivered', handler);
}

export function onNewNotification(handler) {
  return subscribe('notification:new', handler);
}

export function onDonationChatMessage(handler) {
  return subscribe('donation:chat', handler);
}

export function onImpactReceiptUpdated(handler) {
  return subscribe('impact:updated', handler);
}

export { MAX_RECEIVER_RADIUS_KM, MAX_DRIVER_RADIUS_KM };
