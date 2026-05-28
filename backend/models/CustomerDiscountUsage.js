const mongoose = require('mongoose');

const customerDiscountUsageSchema = new mongoose.Schema(
  {
    customerId: {
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
    discountedUnitsUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 20,
    },
  },
  { timestamps: true }
);

customerDiscountUsageSchema.index({ customerId: 1, yearMonth: 1 }, { unique: true });

module.exports = mongoose.model('CustomerDiscountUsage', customerDiscountUsageSchema);
