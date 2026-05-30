const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    foodCategory: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    initialQuantity: { type: Number, default: null, min: 1 },
    parentListingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      default: null,
      index: true,
    },
    storageRecommendation: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    userProvidedExpiryDate: { type: String, default: null, trim: true },
    aiConfidence: { type: Number, default: null },
    aiQualityScore: { type: Number, default: null },
    aiFreshness: { type: String, default: null, trim: true },
    aiDetectedItems: { type: [String], default: [] },
    productType: { type: String, default: null, trim: true },
    expiryDateFromPackage: { type: String, default: null, trim: true },
    listingType: {
      type: String,
      enum: ['donate', 'sell'],
      default: 'donate',
      required: true,
    },
    priceAmount: { type: Number, default: null, min: 0 },
    priceCurrency: { type: String, default: 'LKR', trim: true },
    aiSuggestedPrice: { type: Number, default: null, min: 0 },
    discountMeta: {
      lastSuggestedPrice: { type: Number, default: null, min: 0 },
      lastSuggestedAt: { type: Date, default: null },
      lastDiscountPercent: { type: Number, default: null, min: 0 },
      lastSuggestionReason: { type: String, default: null, trim: true },
      lastIsFreeRecommendation: { type: Boolean, default: false },
      lastAppliedPrice: { type: Number, default: null, min: 0 },
      lastOriginalPrice: { type: Number, default: null, min: 0 },
      lastAppliedAt: { type: Date, default: null },
      lastAppliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },
    pickupAddress: { type: String, required: true, trim: true },
    donorLatitude: { type: Number, required: true },
    donorLongitude: { type: Number, required: true },
    receiverLatitude: { type: Number, default: null },
    receiverLongitude: { type: Number, default: null },
    receiverAddress: { type: String, default: null, trim: true },
    claimedAt: { type: Date, default: null },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    assignedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    status: {
      type: String,
      enum: [
        'draft',
        'available',
        'claimed',
        'driver_assigned',
        'picked_up',
        'in_transit',
        'delivered',
        'cancelled',
      ],
      default: 'available',
      index: true,
    },
    trackingId: { type: String, unique: true, sparse: true, trim: true },

    deliveryDistanceKm: { type: Number, default: null, min: 0 },
    deliveryFeeQuoted: { type: Number, default: null, min: 0 },
    deliveryFeeDiscount: { type: Number, default: null, min: 0 },
    deliveryFeeFinal: { type: Number, default: null, min: 0 },
    deliveryPayer: {
      type: String,
      enum: ['receiver', 'platform'],
      default: null,
    },
    deliveryQuotedRatePerKm: { type: Number, default: null, min: 0 },
    deliveryFinalRatePerKm: { type: Number, default: null, min: 0 },
    deliveryVehicleTier: { type: String, default: null, trim: true },
  },
  { timestamps: true }
);

donationSchema.pre('save', function generateTrackingId() {
  if (!this.trackingId) {
    const suffix = this._id
      ? this._id.toString().slice(-6).toUpperCase()
      : Date.now().toString(36).toUpperCase();
    this.trackingId = `FL-${suffix}`;
  }
});

const { getReceiverDisplayName, getDriverDisplayName } = require('../utils/donationHelpers');

donationSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  const id = obj._id.toString();
  const initialQuantity = obj.initialQuantity != null ? obj.initialQuantity : obj.quantity;
  const listingType = (obj.listingType || '').toLowerCase();
  let unitPriceAmount = null;
  if (listingType === 'sell' && obj.priceAmount != null && initialQuantity > 0) {
    const total = Number(obj.priceAmount);
    if (!Number.isNaN(total) && total > 0) {
      unitPriceAmount = Math.round((total / initialQuantity) * 100) / 100;
    }
  }

  return {
    id,
    _id: id,
    donorId:
      obj.donorId?._id?.toString?.() ||
      obj.donorId?.toString?.() ||
      obj.donorId ||
      null,
    receiverId:
      obj.receiverId?._id?.toString?.() ||
      obj.receiverId?.toString?.() ||
      obj.receiverId ||
      null,
    receiverName:
      obj.receiverId && typeof obj.receiverId === 'object'
        ? getReceiverDisplayName(obj.receiverId)
        : null,
    foodCategory: obj.foodCategory,
    itemName: obj.itemName,
    quantity: obj.quantity,
    initialQuantity,
    parentListingId:
      obj.parentListingId?._id?.toString?.() ||
      obj.parentListingId?.toString?.() ||
      obj.parentListingId ||
      null,
    unitPriceAmount,
    storageRecommendation: obj.storageRecommendation,
    imageUrl: obj.imageUrl,
    userProvidedExpiryDate: obj.userProvidedExpiryDate,
    expiryDate: obj.userProvidedExpiryDate || null,
    aiConfidence: obj.aiConfidence,
    aiQualityScore: obj.aiQualityScore,
    aiFreshness: obj.aiFreshness,
    aiDetectedItems: obj.aiDetectedItems || [],
    productType: obj.productType,
    expiryDateFromPackage: obj.expiryDateFromPackage,
    listingType: obj.listingType,
    priceAmount: obj.priceAmount,
    priceCurrency: obj.priceCurrency,
    aiSuggestedPrice: obj.aiSuggestedPrice,
    discountMeta: {
      lastSuggestedPrice: obj.discountMeta?.lastSuggestedPrice ?? null,
      lastSuggestedAt: obj.discountMeta?.lastSuggestedAt ?? null,
      lastDiscountPercent: obj.discountMeta?.lastDiscountPercent ?? null,
      lastSuggestionReason: obj.discountMeta?.lastSuggestionReason ?? null,
      lastIsFreeRecommendation: obj.discountMeta?.lastIsFreeRecommendation ?? false,
      lastAppliedPrice: obj.discountMeta?.lastAppliedPrice ?? null,
      lastOriginalPrice: obj.discountMeta?.lastOriginalPrice ?? null,
      lastAppliedAt: obj.discountMeta?.lastAppliedAt ?? null,
      lastAppliedBy:
        obj.discountMeta?.lastAppliedBy?.toString?.() || obj.discountMeta?.lastAppliedBy || null,
    },
    pickupAddress: obj.pickupAddress || null,
    donorAddress: obj.pickupAddress || null,
    donorLatitude: obj.donorLatitude,
    donorLongitude: obj.donorLongitude,
    receiverLatitude: obj.receiverLatitude ?? null,
    receiverLongitude: obj.receiverLongitude ?? null,
    receiverAddress: obj.receiverAddress || null,
    claimedAt: obj.claimedAt || null,
    driverId:
      obj.driverId?._id?.toString?.() ||
      obj.driverId?.toString?.() ||
      obj.driverId ||
      null,
    driverName:
      obj.driverId && typeof obj.driverId === 'object'
        ? getDriverDisplayName(obj.driverId)
        : null,
    assignedAt: obj.assignedAt || null,
    pickedUpAt: obj.pickedUpAt || null,
    deliveredAt: obj.deliveredAt || null,
    status: obj.status,
    trackingId: obj.trackingId,
    deliveryDistanceKm: obj.deliveryDistanceKm ?? null,
    deliveryFeeQuoted: obj.deliveryFeeQuoted ?? null,
    deliveryFeeDiscount: obj.deliveryFeeDiscount ?? null,
    deliveryFeeFinal: obj.deliveryFeeFinal ?? null,
    deliveryPayer: obj.deliveryPayer ?? null,
    deliveryQuotedRatePerKm: obj.deliveryQuotedRatePerKm ?? null,
    deliveryFinalRatePerKm: obj.deliveryFinalRatePerKm ?? null,
    deliveryVehicleTier: obj.deliveryVehicleTier ?? null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('Donation', donationSchema);
