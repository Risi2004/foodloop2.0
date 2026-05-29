const mongoose = require('mongoose');

const supplierAiUsageSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    dateKey: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    count: { type: Number, required: true, min: 0, default: 0 },
  },
  { timestamps: true }
);

supplierAiUsageSchema.index({ supplierId: 1, dateKey: 1 }, { unique: true });

module.exports = mongoose.model('SupplierAiUsage', supplierAiUsageSchema);
