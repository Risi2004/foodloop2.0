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

function copyParentFieldsForChild(parent, claimQuantity, claimPrice) {
  return {
    donorId: parent.donorId,
    foodCategory: parent.foodCategory,
    itemName: parent.itemName,
    quantity: claimQuantity,
    initialQuantity: claimQuantity,
    parentListingId: parent._id,
    storageRecommendation: parent.storageRecommendation,
    imageUrl: parent.imageUrl,
    preferredPickupDate: parent.preferredPickupDate,
    preferredPickupTimeFrom: parent.preferredPickupTimeFrom,
    preferredPickupTimeTo: parent.preferredPickupTimeTo,
    userProvidedExpiryDate: parent.userProvidedExpiryDate,
    aiConfidence: parent.aiConfidence,
    aiQualityScore: parent.aiQualityScore,
    aiFreshness: parent.aiFreshness,
    aiDetectedItems: parent.aiDetectedItems || [],
    productType: parent.productType,
    expiryDateFromPackage: parent.expiryDateFromPackage,
    listingType: parent.listingType,
    priceAmount: parent.listingType === 'sell' ? claimPrice : null,
    priceCurrency: parent.priceCurrency || 'LKR',
    aiSuggestedPrice: null,
    pickupAddress: parent.pickupAddress,
    donorLatitude: parent.donorLatitude,
    donorLongitude: parent.donorLongitude,
    status: 'claimed',
  };
}

async function forkClaimFromListing({
  parentId,
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
      parent = await Donation.findOneAndUpdate(
        {
          _id: parentId,
          status: 'available',
          parentListingId: null,
          quantity: { $gte: qty },
        },
        { $inc: { quantity: -qty } },
        { new: true, session }
      );

      if (!parent) {
        const err = new Error('Not enough quantity available for this claim.');
        err.statusCode = 409;
        throw err;
      }

      const claimPrice =
        parent.listingType === 'sell' ? computeClaimFoodSubtotal(parent, qty) : null;

      const childData = copyParentFieldsForChild(parent, qty, claimPrice);
      childData.receiverId = receiverId;
      childData.receiverLatitude = receiverLatitude;
      childData.receiverLongitude = receiverLongitude;
      childData.receiverAddress = receiverAddress;
      childData.claimedAt = new Date();

      const created = await Donation.create([childData], { session });
      child = created[0];
    });

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

module.exports = {
  roundCurrency,
  getInitialQuantity,
  getUnitPriceAmount,
  computeClaimFoodSubtotal,
  forkClaimFromListing,
  restoreParentQuantityOnCancel,
};
