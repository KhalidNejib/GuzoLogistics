import mongoose, { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const orderSchema = new Schema(
  {
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'DELIVERED', 'CANCELLED', 'ARRIVED'],
      default: 'PENDING',
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
    },
    pickupAddress: {
      addressText: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    deliveryAddress: {
      addressText: { type: String, required: true },
      location: {
        type: { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true },
      },
    },
    itemDetails: {
      description: { type: String, required: true },
      weightKg: { type: Number, required: true },
      dimensions: { type: String },
      isPickedUp: { type: Boolean, default: false },
    },
    verificationCode: {
      type: String,
      required: true,
    },
    priceInfo: {
      currency: { type: String, default: 'ETB' },
      amount: { type: Number, required: true }, // Delivery Fee
      itemPrice: { type: Number, default: 0 },   // Product Price (for COD)
    },
    distanceKm: { type: Number },
    trackingUrlToken: { type: String, required: true, unique: true },
    routeHistory: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    deliveredAt: { type: Date },
    podImageUrl: { type: String },
    financeSnapshot: {
      merchantProfit: Number,
      riderEarning: Number,
      settlementMethod: {
        type: String,
        enum: ['AUTO_DIGITAL_REBALANCE', 'PHYSICAL_CASH_DEBT', 'DIGITAL_PAYMENT_DIRECT'],
      },
      // Set when settleOrder() throws after the order was already marked
      // DELIVERED. The order status update and the money movement are two
      // separate writes (order status commits synchronously in the request;
      // settlement runs afterward), so this flag is how a failure between the
      // two becomes visible/queryable instead of silently vanishing into a
      // log line. Ops should filter on this for manual reconciliation.
      settlementFailed: {
        type: Boolean,
        default: false,
      },
      // Set inside the settleOrder() transaction once money has actually
      // moved. This is the guard against double-settlement: if
      // updateOrderStatus() is retried/duplicated after the order is
      // already DELIVERED, settleOrder() checks this flag and aborts
      // instead of re-crediting balances a second time.
      settled: {
        type: Boolean,
        default: false,
      },
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'DIGITAL'],
      default: 'CASH',
    },
    paymentStatus: {
      type: String,
      enum: ['UNPAID', 'PAID'],
      default: 'UNPAID',
    },
    customerRating: {
      type: Number,
      min: 1,
      max: 5,
    },
  },
  { timestamps: true }
);

// Geospatial indexes
orderSchema.index({ 'pickupAddress.location': '2dsphere' });
orderSchema.index({ 'deliveryAddress.location': '2dsphere' });

// Compound indexes for common query patterns
orderSchema.index({ merchant: 1, createdAt: -1 }); // getMerchantOrders
orderSchema.index({ rider: 1, status: 1 });          // getMyOrders
orderSchema.index({ status: 1, createdAt: -1 });     // PENDING dispatch + admin queries

type Order = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<Order>;

const Order = mongoose.models.Order || model<Order>('Order', orderSchema);
export default Order; // 👈 This line is missing
