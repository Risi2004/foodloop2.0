const mongoose = require('mongoose');

const payoutRequestSchema = new mongoose.Schema(
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
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'paid'],
      default: 'pending',
      index: true,
    },
    bankAccountName: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    bankAccountNumber: { type: String, required: true, trim: true },
    bankBranch: { type: String, default: '', trim: true },
    adminNote: { type: String, default: null, trim: true },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    processedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    expectedTransferBy: { type: Date, default: null },
    transactionIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EarningsTransaction',
      },
    ],
  },
  { timestamps: true }
);

payoutRequestSchema.index({ userId: 1, status: 1, createdAt: -1 });
payoutRequestSchema.index({ status: 1, createdAt: -1 });

payoutRequestSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  const id = obj._id.toString();
  return {
    id,
    _id: id,
    userId: obj.userId?.toString?.() || obj.userId,
    roleType: obj.roleType,
    amount: obj.amount,
    currency: obj.currency || 'LKR',
    status: obj.status,
    bankAccountName: obj.bankAccountName,
    bankName: obj.bankName,
    bankAccountNumber: obj.bankAccountNumber,
    bankBranch: obj.bankBranch || '',
    adminNote: obj.adminNote || null,
    processedBy: obj.processedBy?.toString?.() || obj.processedBy || null,
    processedAt: obj.processedAt || null,
    paidAt: obj.paidAt || null,
    expectedTransferBy: obj.expectedTransferBy || null,
    transactionIds: (obj.transactionIds || []).map((tid) => tid?.toString?.() || tid),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('PayoutRequest', payoutRequestSchema);
