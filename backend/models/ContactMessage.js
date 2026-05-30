const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    contactNo: { type: String, trim: true, maxlength: 30, default: '' },
    subject: { type: String, trim: true, maxlength: 200, default: '' },
    message: { type: String, required: true, trim: true, maxlength: 5000 },
    status: {
      type: String,
      enum: ['pending', 'replied'],
      default: 'pending',
      index: true,
    },
    adminReply: { type: String, trim: true, maxlength: 5000, default: null },
    repliedAt: { type: Date, default: null },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    sourcePage: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

contactMessageSchema.methods.toListJSON = function toListJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    contactNo: this.contactNo || '',
    subject: this.subject || '',
    message: this.message,
    status: this.status,
    adminReply: this.adminReply || null,
    repliedAt: this.repliedAt || null,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('ContactMessage', contactMessageSchema);
