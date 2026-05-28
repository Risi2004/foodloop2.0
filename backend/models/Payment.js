const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true, index: true },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      index: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'LKR', trim: true },
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

module.exports = mongoose.model('Payment', paymentSchema);
