const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema(
  {
    donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    foodCategory: { type: String, required: true, trim: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    storageRecommendation: { type: String, required: true, trim: true },
    imageUrl: { type: String, required: true, trim: true },
    preferredPickupDate: { type: String, required: true, trim: true },
    preferredPickupTimeFrom: { type: String, required: true, trim: true },
    preferredPickupTimeTo: { type: String, required: true, trim: true },
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
    pickupAddress: { type: String, required: true, trim: true },
    donorLatitude: { type: Number, required: true },
    donorLongitude: { type: Number, required: true },
    status: {
      type: String,
      enum: [
        'draft',
        'available',
        'claimed',
        'driver_assigned',
        'in_transit',
        'delivered',
        'cancelled',
      ],
      default: 'available',
      index: true,
    },
    trackingId: { type: String, unique: true, sparse: true, trim: true },
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

donationSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  const id = obj._id.toString();

  return {
    id,
    _id: id,
    donorId: obj.donorId?.toString?.() || obj.donorId,
    foodCategory: obj.foodCategory,
    itemName: obj.itemName,
    quantity: obj.quantity,
    storageRecommendation: obj.storageRecommendation,
    imageUrl: obj.imageUrl,
    preferredPickupDate: obj.preferredPickupDate,
    preferredPickupTimeFrom: obj.preferredPickupTimeFrom,
    preferredPickupTimeTo: obj.preferredPickupTimeTo,
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
    pickupAddress: obj.pickupAddress || null,
    donorAddress: obj.pickupAddress || null,
    donorLatitude: obj.donorLatitude,
    donorLongitude: obj.donorLongitude,
    status: obj.status,
    trackingId: obj.trackingId,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('Donation', donationSchema);
