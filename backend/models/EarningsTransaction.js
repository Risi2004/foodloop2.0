const mongoose = require('mongoose');

const earningsTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    roleType: {
      type: String,
      enum: ['supplier', 'driver'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR', trim: true },
    sourceType: {
      type: String,
      enum: ['donation_delivery', 'customer_order_delivery'],
      required: true,
      index: true,
    },
    sourceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    referenceLabel: { type: String, default: '', trim: true },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      default: null,
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      default: null,
    },
    customerOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CustomerOrder',
      default: null,
    },
    grossAmount: { type: Number, default: null, min: 0 },
    platformFee: { type: Number, default: null, min: 0 },
    paymentMethod: { type: String, enum: ['card', 'cod'], default: null },
    codAmountCollected: { type: Number, default: null, min: 0 },
    deliveryFeeAmount: { type: Number, default: null, min: 0 },
    foodSubtotal: { type: Number, default: null, min: 0 },
    status: {
      type: String,
      enum: ['available', 'locked', 'paid_out'],
      default: 'available',
      index: true,
    },
    payoutRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PayoutRequest',
      default: null,
    },
    creditedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

earningsTransactionSchema.index({ userId: 1, sourceType: 1, sourceId: 1 }, { unique: true });
earningsTransactionSchema.index({ userId: 1, status: 1, creditedAt: -1 });

earningsTransactionSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  const id = obj._id.toString();
  return {
    id,
    _id: id,
    userId: obj.userId?.toString?.() || obj.userId,
    roleType: obj.roleType,
    amount: obj.amount,
    currency: obj.currency || 'LKR',
    sourceType: obj.sourceType,
    sourceId: obj.sourceId?.toString?.() || obj.sourceId,
    referenceLabel: obj.referenceLabel || '',
    paymentId: obj.paymentId?.toString?.() || obj.paymentId || null,
    donationId: obj.donationId?.toString?.() || obj.donationId || null,
    customerOrderId: obj.customerOrderId?.toString?.() || obj.customerOrderId || null,
    grossAmount: obj.grossAmount ?? null,
    platformFee: obj.platformFee ?? null,
    paymentMethod: obj.paymentMethod ?? null,
    codAmountCollected: obj.codAmountCollected ?? null,
    deliveryFeeAmount: obj.deliveryFeeAmount ?? null,
    foodSubtotal: obj.foodSubtotal ?? null,
    status: obj.status,
    payoutRequestId: obj.payoutRequestId?.toString?.() || obj.payoutRequestId || null,
    creditedAt: obj.creditedAt || obj.createdAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('EarningsTransaction', earningsTransactionSchema);
