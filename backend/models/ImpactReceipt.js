const mongoose = require('mongoose');

const impactReceiptSchema = new mongoose.Schema(
  {
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donation',
      required: true,
      unique: true,
      index: true,
    },
    dropLocation: { type: String, required: true, trim: true },
    peopleFed: { type: Number, required: true, min: 1 },
    weightPerServing: { type: Number, required: true, min: 0.001 },
    methaneSaved: { type: Number, required: true, min: 0 },
    distanceTraveled: { type: Number, default: null, min: 0 },
    status: {
      type: String,
      enum: ['finalized'],
      default: 'finalized',
    },
    finalizedAt: { type: Date, default: Date.now },
    generatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

impactReceiptSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  return {
    id: obj._id.toString(),
    donationId: obj.donationId?.toString?.() || obj.donationId,
    dropLocation: obj.dropLocation,
    peopleFed: obj.peopleFed,
    weightPerServing: obj.weightPerServing,
    methaneSaved: obj.methaneSaved,
    distanceTraveled: obj.distanceTraveled ?? null,
    status: obj.status,
    finalizedAt: obj.finalizedAt,
    generatedAt: obj.generatedAt,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('ImpactReceipt', impactReceiptSchema);
