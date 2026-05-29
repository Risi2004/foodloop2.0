const mongoose = require('mongoose');

const receiverDeliveryDiscountUsageSchema = new mongoose.Schema(
  {
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    yearMonth: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    discountedDeliveriesUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 20,
    },
  },
  { timestamps: true }
);

receiverDeliveryDiscountUsageSchema.index({ receiverId: 1, yearMonth: 1 }, { unique: true });

module.exports = mongoose.model('ReceiverDeliveryDiscountUsage', receiverDeliveryDiscountUsageSchema);
