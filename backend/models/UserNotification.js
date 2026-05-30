const mongoose = require('mongoose');

const userNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    notificationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Notification',
      required: true,
      index: true,
    },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userNotificationSchema.index({ userId: 1, notificationId: 1 }, { unique: true });
userNotificationSchema.index({ userId: 1, readAt: 1 });

module.exports = mongoose.model('UserNotification', userNotificationSchema);
