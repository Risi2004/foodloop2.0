const mongoose = require('mongoose');

const MAINTENANCE_MODES = ['off', 'scheduled', 'sudden_drain', 'sudden_active'];

const maintenanceConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'global' },
    mode: {
      type: String,
      enum: MAINTENANCE_MODES,
      default: 'off',
    },
    scheduledStart: { type: Date, default: null },
    scheduledEnd: { type: Date, default: null },
    scheduledMessage: { type: String, default: '', trim: true },
    scheduledStartEmailSentAt: { type: Date, default: null },
    suddenStartedAt: { type: Date, default: null },
    suddenActivatedAt: { type: Date, default: null },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true, _id: false }
);

maintenanceConfigSchema.statics.getGlobal = async function getGlobal() {
  let doc = await this.findById('global');
  if (!doc) {
    doc = await this.create({ _id: 'global', mode: 'off' });
  }
  return doc;
};

maintenanceConfigSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  return {
    mode: obj.mode,
    scheduledStart: obj.scheduledStart || null,
    scheduledEnd: obj.scheduledEnd || null,
    scheduledMessage: obj.scheduledMessage || '',
    scheduledStartEmailSentAt: obj.scheduledStartEmailSentAt || null,
    suddenStartedAt: obj.suddenStartedAt || null,
    suddenActivatedAt: obj.suddenActivatedAt || null,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('MaintenanceConfig', maintenanceConfigSchema);
module.exports.MAINTENANCE_MODES = MAINTENANCE_MODES;
