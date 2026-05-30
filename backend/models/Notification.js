const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true, maxlength: 200, default: 'Update' },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    targetRoles: {
      type: [String],
      enum: ['Donor', 'Receiver', 'Driver', 'All'],
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    recipientCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: -1 });

notificationSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: this._id.toString(),
    title: this.title || 'Update',
    message: this.message,
    status: this.status,
    targetRoles: this.targetRoles || [],
    createdAt: this.createdAt,
    recipientCount: this.recipientCount || 0,
  };
};

module.exports = mongoose.model('Notification', notificationSchema);
