const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true, index: true },
    paymentContext: {
      type: String,
      enum: [
        'claim',
        'customer_checkout',
        'supplier_ai_subscription',
        'supplier_esg_subscription',
        'supplier_bundle_subscription',
      ],
      default: 'claim',
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: false,
      index: true,
    },
    claimedDonationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: false,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR', trim: true },
    // Mixed shape: claim checkout, customer checkout, supplier subscriptions, etc.
    orderSummary: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'consumed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    cardLast4: { type: String, default: null, trim: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

paymentSchema.index({ donationId: 1, status: 1 });
paymentSchema.index({ claimedDonationId: 1, status: 1 });
paymentSchema.index({ customerId: 1, status: 1 });
paymentSchema.index({ supplierId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
