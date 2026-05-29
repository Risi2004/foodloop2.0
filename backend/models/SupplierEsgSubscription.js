const mongoose = require('mongoose');

const supplierEsgSubscriptionSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired'],
      default: 'active',
      index: true,
    },
    paidThroughMonth: {
      type: String,
      trim: true,
      match: /^\d{4}-\d{2}$/,
    },
    periodStart: { type: Date, required: true },
    expiresAt: { type: Date, required: true, index: true },
    nextRenewalAt: { type: Date, default: null, index: true },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR', trim: true },
    cardLast4: { type: String, default: null, trim: true },
    autoRenew: { type: Boolean, default: false },
    autoRenewCancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

supplierEsgSubscriptionSchema.index({ autoRenew: 1, nextRenewalAt: 1, status: 1 });

module.exports = mongoose.model('SupplierEsgSubscription', supplierEsgSubscriptionSchema);
