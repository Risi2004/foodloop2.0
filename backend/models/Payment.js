const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true, index: true },
    paymentContext: {
      type: String,
      enum: ['claim', 'customer_checkout'],
      default: 'claim',
      index: true,
    },
    donationId: {
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
    orderSummary: {
      items: [
        {
          id: { type: String, default: null },
          name: { type: String, default: '' },
          quantity: { type: Number, min: 1, default: 1 },
          unitPrice: { type: Number, min: 0, default: 0 },
          lineTotal: { type: Number, min: 0, default: 0 },
        },
      ],
      subtotal: { type: Number, min: 0, default: 0 },
      deliveryFee: { type: Number, min: 0, default: 0 },
      total: { type: Number, min: 0, default: 0 },
      address: { type: String, default: '' },
      customerLatitude: { type: Number, default: null },
      customerLongitude: { type: Number, default: null },
      paymentMethod: { type: String, default: 'card' },
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
paymentSchema.index({ customerId: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
