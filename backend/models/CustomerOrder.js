const mongoose = require('mongoose');

const customerOrderSchema = new mongoose.Schema(
  {
    orderId: { type: String, required: true, unique: true, trim: true, index: true },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['finding_driver', 'driver_assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
      default: 'finding_driver',
      index: true,
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'cod'],
      required: true,
      default: 'card',
      index: true,
    },
    codAmount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: 'LKR', trim: true },
    orderSummary: {
      items: [
        {
          id: { type: String, default: null },
          name: { type: String, default: '' },
          quantity: { type: Number, min: 1, default: 1 },
          unitPrice: { type: Number, min: 0, default: 0 },
          lineTotal: { type: Number, min: 0, default: 0 },
        },
      ],
      subtotal: { type: Number, min: 0, default: 0 },
      deliveryFee: { type: Number, min: 0, default: 0 },
      total: { type: Number, min: 0, default: 0 },
      address: { type: String, default: '' },
    },
    customerAddress: { type: String, default: '' },
    customerLatitude: { type: Number, default: null },
    customerLongitude: { type: Number, default: null },
    assignedAt: { type: Date, default: null },
    pickedUpAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  { timestamps: true }
);

customerOrderSchema.index({ customerId: 1, status: 1, createdAt: -1 });
customerOrderSchema.index({ driverId: 1, status: 1, updatedAt: -1 });
customerOrderSchema.index({ status: 1, createdAt: -1 });

customerOrderSchema.methods.toPublicJSON = function toPublicJSON() {
  const obj = this.toObject();
  const id = obj._id.toString();
  return {
    id,
    _id: id,
    orderId: obj.orderId,
    paymentId: obj.paymentId?.toString?.() || obj.paymentId || null,
    customerId: obj.customerId?.toString?.() || obj.customerId || null,
    driverId: obj.driverId?.toString?.() || obj.driverId || null,
    status: obj.status,
    paymentMethod: obj.paymentMethod,
    codAmount: obj.codAmount || 0,
    currency: obj.currency || 'LKR',
    orderSummary: obj.orderSummary || {},
    customerAddress: obj.customerAddress || '',
    customerLatitude: obj.customerLatitude,
    customerLongitude: obj.customerLongitude,
    assignedAt: obj.assignedAt || null,
    pickedUpAt: obj.pickedUpAt || null,
    deliveredAt: obj.deliveredAt || null,
    cancelledAt: obj.cancelledAt || null,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
};

module.exports = mongoose.model('CustomerOrder', customerOrderSchema);
