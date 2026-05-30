/**
 * Repair claim records and stuck parent listings.
 *
 * Run locally (requires MongoDB Atlas access from your machine):
 *   cd backend
 *   node scripts/backfillClaimFields.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Donation = require('../models/Donation');
const Payment = require('../models/Payment');

const COPY_FIELDS = [
  'donorId',
  'foodCategory',
  'itemName',
  'storageRecommendation',
  'imageUrl',
  'userProvidedExpiryDate',
  'productType',
  'expiryDateFromPackage',
  'listingType',
  'priceCurrency',
  'pickupAddress',
  'donorLatitude',
  'donorLongitude',
  'aiConfidence',
  'aiQualityScore',
  'aiFreshness',
  'aiDetectedItems',
];

function isMissing(value) {
  if (value == null) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  return false;
}

async function backfillInitialQuantityOnParents() {
  const parents = await Donation.find({ parentListingId: null });
  let fixed = 0;

  for (const parent of parents) {
    const children = await Donation.find({
      parentListingId: parent._id,
      status: { $nin: ['cancelled'] },
    });
    const claimedQty = children.reduce((sum, c) => sum + (c.quantity || 0), 0);
    const inferredInitial = (parent.quantity || 0) + claimedQty;

    if (parent.initialQuantity == null || parent.initialQuantity < inferredInitial) {
      parent.initialQuantity = Math.max(inferredInitial, parent.quantity || 1);
      await parent.save();
      fixed += 1;
      console.log('Backfilled initialQuantity on parent', parent._id.toString(), '→', parent.initialQuantity);
    }
  }

  return fixed;
}

async function backfillChildClaims() {
  const children = await Donation.find({ parentListingId: { $ne: null } });
  let updated = 0;

  for (const child of children) {
    const parent = await Donation.findById(child.parentListingId);
    if (!parent) continue;

    let changed = false;
    for (const field of COPY_FIELDS) {
      if (isMissing(child[field]) && !isMissing(parent[field])) {
        child[field] = parent[field];
        changed = true;
      }
    }

    if (child.listingType === 'sell' && isMissing(child.priceAmount) && parent.priceAmount > 0) {
      const unit = parent.priceAmount / (parent.initialQuantity || parent.quantity || 1);
      child.priceAmount = Math.round(unit * child.quantity * 100) / 100;
      changed = true;
    }

    if (changed) {
      await child.save();
      updated += 1;
      console.log('Updated child claim', child._id.toString());
    }
  }

  return updated;
}

async function collapseFullClaimsOntoParent() {
  const children = await Donation.find({
    parentListingId: { $ne: null },
    status: { $nin: ['cancelled'] },
  });
  let merged = 0;

  for (const child of children) {
    const parent = await Donation.findById(child.parentListingId);
    if (!parent) continue;

    const childQty = child.quantity || 0;
    const parentQty = parent.quantity || 0;
    const initialQty = parent.initialQuantity ?? parentQty + childQty;

    if (parent.status === 'available' && parentQty === 0 && child.receiverId) {
      if (parent.status !== 'cancelled') {
        parent.status = 'cancelled';
        await parent.save();
        console.log('Closed depleted parent listing', parent._id.toString());
        merged += 1;
      }
      continue;
    }

    if (
      parent.status === 'available' &&
      !parent.receiverId &&
      child.receiverId &&
      childQty >= initialQty
    ) {
      parent.receiverId = child.receiverId;
      parent.receiverLatitude = child.receiverLatitude;
      parent.receiverLongitude = child.receiverLongitude;
      parent.receiverAddress = child.receiverAddress;
      parent.claimedAt = child.claimedAt || new Date();
      parent.status = child.status;
      parent.quantity = childQty;
      parent.driverId = child.driverId || null;
      parent.assignedAt = child.assignedAt || null;
      parent.pickedUpAt = child.pickedUpAt || null;
      parent.deliveredAt = child.deliveredAt || null;
      parent.deliveryDistanceKm = child.deliveryDistanceKm;
      parent.deliveryFeeQuoted = child.deliveryFeeQuoted;
      parent.deliveryFeeDiscount = child.deliveryFeeDiscount;
      parent.deliveryFeeFinal = child.deliveryFeeFinal;
      parent.deliveryPayer = child.deliveryPayer;
      parent.deliveryQuotedRatePerKm = child.deliveryQuotedRatePerKm;
      parent.deliveryFinalRatePerKm = child.deliveryFinalRatePerKm;
      parent.deliveryVehicleTier = child.deliveryVehicleTier;
      await parent.save();

      child.status = 'cancelled';
      await child.save();

      console.log('Merged full child claim into parent', parent._id.toString());
      merged += 1;
    }
  }

  return merged;
}

async function applyConsumedPaymentsToListings() {
  const payments = await Payment.find({
    status: 'consumed',
    donationId: { $ne: null },
  });
  let fixed = 0;

  for (const payment of payments) {
    if (payment.claimedDonationId) {
      const claimed = await Donation.findById(payment.claimedDonationId);
      if (claimed?.receiverId) continue;
    }

    const listing = await Donation.findById(payment.donationId);
    if (!listing || listing.parentListingId) continue;
    if (listing.status !== 'available' || listing.receiverId) continue;

    const summary = payment.orderSummary || {};
    if (summary.receiverLatitude == null || summary.receiverLongitude == null) continue;

    const claimQty = Math.max(1, Math.round(Number(summary.claimQuantity) || 1));
    const isFullClaim = claimQty >= (listing.quantity || 1);

    if (!isFullClaim) {
      console.log(
        'Skipped partial payment fix for listing (use app retry-claim):',
        listing._id.toString(),
        payment.orderId
      );
      continue;
    }

    listing.receiverId = payment.receiverId;
    listing.receiverLatitude = summary.receiverLatitude;
    listing.receiverLongitude = summary.receiverLongitude;
    listing.receiverAddress = summary.receiverAddress || listing.receiverAddress || 'Address on file';
    listing.claimedAt = payment.consumedAt || payment.updatedAt || new Date();
    listing.status = 'claimed';
    listing.quantity = claimQty;
    await listing.save();

    payment.claimedDonationId = listing._id;
    await payment.save();

    console.log('Applied consumed payment to listing (full claim)', listing._id.toString());
    fixed += 1;
  }

  return fixed;
}

async function reportPaidUnconsumedPayments() {
  const payments = await Payment.find({
    status: 'paid',
    donationId: { $ne: null },
    expiresAt: { $gt: new Date() },
  });
  if (payments.length === 0) return 0;

  console.log(`Found ${payments.length} paid but unconsumed payment(s). Retry via POST /api/payments/claim/retry:`);
  for (const payment of payments) {
    console.log(' - orderId:', payment.orderId, 'donationId:', payment.donationId?.toString());
  }
  return payments.length;
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in backend/.env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const initialQtyFixes = await backfillInitialQuantityOnParents();
  const childUpdates = await backfillChildClaims();
  const merged = await collapseFullClaimsOntoParent();
  const paymentFixes = await applyConsumedPaymentsToListings();
  const pendingPaid = await reportPaidUnconsumedPayments();

  console.log(
    `Done. initialQuantity fixes: ${initialQtyFixes}, child fields updated: ${childUpdates}, merged full claims: ${merged}, payment fixes: ${paymentFixes}, paid-unconsumed reported: ${pendingPaid}`
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
