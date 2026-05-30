const mongoose = require('mongoose');
const Donation = require('../models/Donation');

function roundCurrency(value) {
  const n = Number(value);
  if (Number.isNaN(n)) return NaN;
  return Math.round(n * 100) / 100;
}

function getInitialQuantity(donation) {
  return donation.initialQuantity != null ? donation.initialQuantity : donation.quantity;
}

function getUnitPriceAmount(donation) {
  const initialQty = getInitialQuantity(donation);
  const total = Number(donation.priceAmount || 0);
  if (!initialQty || initialQty <= 0 || Number.isNaN(total) || total <= 0) return 0;
  return roundCurrency(total / initialQty);
}

function computeClaimFoodSubtotal(donation, claimQuantity) {
  const unitPrice = getUnitPriceAmount(donation);
  return roundCurrency(unitPrice * claimQuantity);
}

function toParentSnapshot(parent) {
  if (!parent) return null;
  if (typeof parent.toObject === 'function') {
    return parent.toObject();
  }
  return { ...parent };
}

function copyParentFieldsForChild(parent, claimQuantity, claimPrice) {
  const source = toParentSnapshot(parent);
  if (!source?._id) {
    const err = new Error('Parent listing data is missing. Cannot create claim.');
    err.statusCode = 500;
    throw err;
  }

  const childData = {
    donorId: source.donorId,
    foodCategory: source.foodCategory,
    itemName: source.itemName,
    quantity: claimQuantity,
    initialQuantity: claimQuantity,
    parentListingId: source._id,
    storageRecommendation: source.storageRecommendation,
    imageUrl: source.imageUrl,
    userProvidedExpiryDate: source.userProvidedExpiryDate,
    aiConfidence: source.aiConfidence,
    aiQualityScore: source.aiQualityScore,
    aiFreshness: source.aiFreshness,
    aiDetectedItems: source.aiDetectedItems || [],
    productType: source.productType,
    expiryDateFromPackage: source.expiryDateFromPackage,
    listingType: source.listingType,
    priceAmount: source.listingType === 'sell' ? claimPrice : null,
    priceCurrency: source.priceCurrency || 'LKR',
    aiSuggestedPrice: null,
    pickupAddress: source.pickupAddress,
    donorLatitude: source.donorLatitude,
    donorLongitude: source.donorLongitude,
    status: 'claimed',
  };

  const requiredFields = [
    'donorId',
    'foodCategory',
    'itemName',
    'storageRecommendation',
    'imageUrl',
    'pickupAddress',
    'donorLatitude',
    'donorLongitude',
  ];
  for (const field of requiredFields) {
    const value = childData[field];
    if (value == null || value === '') {
      const err = new Error(`Parent listing is missing required field "${field}".`);
      err.statusCode = 500;
      throw err;
    }
  }

  return childData;
}

async function claimListingInPlace({
  listingId,
  claimQuantity,
  receiverId,
  receiverLatitude,
  receiverLongitude,
  receiverAddress,
}) {
  const qty = Math.max(1, Math.round(Number(claimQuantity) || 1));
  const session = await mongoose.startSession();

  try {
    let child;

    await session.withTransaction(async () => {
      const listing = await Donation.findOneAndUpdate(
        {
          _id: listingId,
          status: 'available',
          parentListingId: null,
          quantity: { $gte: qty },
        },
        {
          $set: {
            receiverId,
            receiverLatitude,
            receiverLongitude,
            receiverAddress,
            claimedAt: new Date(),
            status: 'claimed',
            quantity: qty,
          },
        },
        { returnDocument: 'after', session, runValidators: true }
      );

      if (!listing) {
        const err = new Error('This donation is no longer available.');
        err.statusCode = 409;
        throw err;
      }

      child = listing;
    });

    if (!child) {
      const err = new Error('Failed to claim donation.');
      err.statusCode = 500;
      throw err;
    }

    return { parent: null, child };
  } finally {
    session.endSession();
  }
}

async function forkClaimFromListing({
  parentId,
  parentSnapshot,
  claimQuantity,
  receiverId,
  receiverLatitude,
  receiverLongitude,
  receiverAddress,
}) {
  const qty = Math.max(1, Math.round(Number(claimQuantity) || 1));
  const session = await mongoose.startSession();

  try {
    let parent;
    let child;

    await session.withTransaction(async () => {
      const snapshot =
        toParentSnapshot(parentSnapshot) ||
        toParentSnapshot(await Donation.findById(parentId).session(session));

      if (!snapshot?._id) {
        const err = new Error('Parent listing not found.');
        err.statusCode = 404;
        throw err;
      }

      if (snapshot.status !== 'available' || snapshot.parentListingId) {
        const err = new Error('This donation is no longer available.');
        err.statusCode = 409;
        throw err;
      }
      if ((snapshot.quantity || 0) < qty) {
        const err = new Error('Not enough quantity available for this claim.');
        err.statusCode = 409;
        throw err;
      }

      const updateResult = await Donation.updateOne(
        {
          _id: parentId,
          status: 'available',
          parentListingId: null,
          quantity: { $gte: qty },
        },
        {
          $inc: { quantity: -qty },
          ...(snapshot.quantity - qty <= 0 ? { $set: { status: 'cancelled' } } : {}),
        },
        { session }
      );

      if (updateResult.modifiedCount !== 1) {
        const err = new Error('Not enough quantity available for this claim.');
        err.statusCode = 409;
        throw err;
      }

      const claimPrice =
        snapshot.listingType === 'sell' ? computeClaimFoodSubtotal(snapshot, qty) : null;

      const childData = copyParentFieldsForChild(snapshot, qty, claimPrice);
      childData.receiverId = receiverId;
      childData.receiverLatitude = receiverLatitude;
      childData.receiverLongitude = receiverLongitude;
      childData.receiverAddress = receiverAddress;
      childData.claimedAt = new Date();

      child = new Donation(childData);
      await child.save({ session });

      parent = await Donation.findById(parentId).session(session);
      if (!parent) {
        const err = new Error('Parent listing not found after claim.');
        err.statusCode = 500;
        throw err;
      }
    });

    if (!parent || !child) {
      const err = new Error('Failed to create claim record.');
      err.statusCode = 500;
      throw err;
    }

    return { parent, child };
  } finally {
    session.endSession();
  }
}

async function restoreParentQuantityOnCancel(childDonation) {
  if (!childDonation.parentListingId) return null;

  const parent = await Donation.findById(childDonation.parentListingId);
  if (!parent) return null;

  parent.quantity = (parent.quantity || 0) + (childDonation.quantity || 0);
  if (parent.quantity > 0 && parent.status !== 'available') {
    parent.status = 'available';
  }
  await parent.save();
  return parent;
}

async function rollbackInPlaceClaim(listing) {
  if (!listing || listing.parentListingId) return listing;

  listing.receiverId = null;
  listing.receiverLatitude = null;
  listing.receiverLongitude = null;
  listing.receiverAddress = null;
  listing.claimedAt = null;
  listing.driverId = null;
  listing.assignedAt = null;
  listing.status = 'available';
  await listing.save();
  return listing;
}

module.exports = {
  roundCurrency,
  getInitialQuantity,
  getUnitPriceAmount,
  computeClaimFoodSubtotal,
  claimListingInPlace,
  forkClaimFromListing,
  restoreParentQuantityOnCancel,
  rollbackInPlaceClaim,
  copyParentFieldsForChild,
};
