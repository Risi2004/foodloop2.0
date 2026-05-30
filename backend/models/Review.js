const mongoose = require('mongoose');

function formatAdminDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewerName: { type: String, required: true, trim: true, maxlength: 120 },
    reviewerRole: { type: String, required: true, trim: true, maxlength: 60 },
    organization: { type: String, trim: true, maxlength: 200, default: '' },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

reviewSchema.index({ status: 1, createdAt: -1 });
reviewSchema.index({ userId: 1, status: 1 });

reviewSchema.methods.toAdminJSON = function toAdminJSON() {
  return {
    id: this._id.toString(),
    name: this.reviewerName,
    date: formatAdminDate(this.createdAt),
    role: this.reviewerRole,
    organization: this.organization || '',
    reviewText: this.text,
    status: this.status,
  };
};

reviewSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.reviewerName,
    role: this.reviewerRole,
    text: this.text,
  };
};

module.exports = mongoose.model('Review', reviewSchema);
