const mongoose = require('mongoose');
const Review = require('../models/Review');
const User = require('../models/User');
const { SUPPLIER_ROLES } = require('../utils/earningsHelpers');
const {
  sendReviewSubmittedPendingEmail,
  sendReviewApprovedEmail,
  sendReviewRejectedEmail,
} = require('../utils/sendNotificationEmail');

function getUserDisplayName(user) {
  if (!user) return 'Anonymous';
  return (
    user.username ||
    user.receiverName ||
    user.driverName ||
    user.businessName ||
    user.email ||
    'Anonymous'
  );
}

function mapRoleLabel(user) {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'admin') return 'Admin';
  if (role === 'receiver') return 'Receiver';
  if (role === 'driver') return 'Driver';
  if (role === 'customer') return 'Customer';
  if (SUPPLIER_ROLES.includes(role) || role === 'donor') return 'Supplier';
  return user?.role || 'User';
}

function getOrganization(user) {
  if (!user) return '';
  return user.businessName || user.receiverName || user.venueType || '';
}

function getReviewerSnapshot(user) {
  return {
    reviewerName: getUserDisplayName(user),
    reviewerRole: mapRoleLabel(user),
    organization: getOrganization(user),
  };
}

async function submitReview(userId, text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    const err = new Error('Review text is required.');
    err.statusCode = 400;
    throw err;
  }
  if (trimmed.length > 500) {
    const err = new Error('Review must be 500 characters or less.');
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(userId);
  if (!user) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const existingPending = await Review.findOne({ userId, status: 'pending' });
  if (existingPending) {
    const err = new Error('You already have a review waiting for admin approval.');
    err.statusCode = 409;
    throw err;
  }

  const snapshot = getReviewerSnapshot(user);
  const review = await Review.create({
    userId,
    text: trimmed,
    status: 'pending',
    ...snapshot,
  });

  sendReviewSubmittedPendingEmail(user, { text: trimmed }).catch((err) => {
    console.error(`[email] Failed to send review pending email to ${user.email}:`, err.message);
  });

  return review.toAdminJSON();
}

async function listPendingReviews() {
  const docs = await Review.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(200);
  return docs.map((doc) => doc.toAdminJSON());
}

async function listApprovedReviews() {
  const docs = await Review.find({ status: 'approved' })
    .sort({ reviewedAt: -1, createdAt: -1 })
    .limit(200);
  return docs.map((doc) => doc.toPublicJSON());
}

async function approveReview(id, adminId) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid review id.');
    err.statusCode = 400;
    throw err;
  }

  const review = await Review.findById(id);
  if (!review) {
    const err = new Error('Review not found.');
    err.statusCode = 404;
    throw err;
  }
  if (review.status !== 'pending') {
    const err = new Error('Only pending reviews can be approved.');
    err.statusCode = 409;
    throw err;
  }

  review.status = 'approved';
  review.reviewedBy = adminId || null;
  review.reviewedAt = new Date();
  review.rejectionReason = null;
  await review.save();

  const user = await User.findById(review.userId);
  if (user?.email) {
    sendReviewApprovedEmail(user, { text: review.text }).catch((err) => {
      console.error(`[email] Failed to send review approved email to ${user.email}:`, err.message);
    });
  }

  return review.toAdminJSON();
}

async function listApprovedReviewsForAdmin() {
  const docs = await Review.find({ status: 'approved' })
    .sort({ reviewedAt: -1, createdAt: -1 })
    .limit(200);
  return docs.map((doc) => doc.toAdminJSON());
}

async function deleteReview(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid review id.');
    err.statusCode = 400;
    throw err;
  }

  const review = await Review.findByIdAndDelete(id);
  if (!review) {
    const err = new Error('Review not found.');
    err.statusCode = 404;
    throw err;
  }

  return { success: true, id };
}

async function rejectReview(id, adminId, reason) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Invalid review id.');
    err.statusCode = 400;
    throw err;
  }

  const trimmedReason = String(reason || '').trim();
  if (!trimmedReason) {
    const err = new Error('Rejection reason is required.');
    err.statusCode = 400;
    throw err;
  }

  const review = await Review.findById(id);
  if (!review) {
    const err = new Error('Review not found.');
    err.statusCode = 404;
    throw err;
  }
  if (review.status !== 'pending') {
    const err = new Error('Only pending reviews can be rejected.');
    err.statusCode = 409;
    throw err;
  }

  review.status = 'rejected';
  review.reviewedBy = adminId || null;
  review.reviewedAt = new Date();
  review.rejectionReason = trimmedReason;
  await review.save();

  const user = await User.findById(review.userId);
  if (user?.email) {
    sendReviewRejectedEmail(user, { text: review.text, reason: trimmedReason }).catch((err) => {
      console.error(`[email] Failed to send review rejected email to ${user.email}:`, err.message);
    });
  }

  return review.toAdminJSON();
}

module.exports = {
  submitReview,
  listPendingReviews,
  listApprovedReviews,
  listApprovedReviewsForAdmin,
  approveReview,
  rejectReview,
  deleteReview,
  mapRoleLabel,
  getReviewerSnapshot,
};
