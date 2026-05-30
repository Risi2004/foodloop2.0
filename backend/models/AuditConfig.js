const mongoose = require('mongoose');

const auditConfigSchema = new mongoose.Schema({
  _id: { type: String, default: 'global' },
  isPaused: { type: Boolean, default: false },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true, _id: false });

auditConfigSchema.statics.getGlobal = async function () {
  let doc = await this.findById('global');
  if (!doc) {
    doc = await this.create({ _id: 'global', isPaused: false });
  }
  return doc;
};

module.exports = mongoose.model('AuditConfig', auditConfigSchema);
