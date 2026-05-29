const mongoose = require('mongoose');

const supplierAiSubscriptionSchema = new mongoose.Schema(
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
    /** @deprecated kept for legacy rows; period end is `expiresAt` */
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

supplierAiSubscriptionSchema.index({ autoRenew: 1, nextRenewalAt: 1, status: 1 });

module.exports = mongoose.model('SupplierAiSubscription', supplierAiSubscriptionSchema);
