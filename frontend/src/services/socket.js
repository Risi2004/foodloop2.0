/**
 * Offline stub — no Socket.IO connection.
 * Preserves the same API surface as the real client.
 */

export function getSocket() {
  return null;
}

export function joinDonation() {
  return Promise.resolve({ success: false, message: 'Offline mode' });
}

export function leaveDonation() {}

export function onDriverLocation() {
  return () => {};
}

export function onDonationCreated() {
  return () => {};
}

export function onDonationClaimed() {
  return () => {};
}

export function onDonationInTransit() {
  return () => {};
}

export function onDeliveryConfirmed() {
  return () => {};
}

export function onNewNotification() {
  return () => {};
}

export function onDonationChatMessage() {
  return () => {};
}

export function onImpactReceiptUpdated() {
  return () => {};
}
