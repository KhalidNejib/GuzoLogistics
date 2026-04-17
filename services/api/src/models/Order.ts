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
      ref: 'RiderProfile',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED', 'CANCELLED'],
      default: 'PENDING',
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
    },
    priceInfo: {
      currency: { type: String, default: 'ETB' },
      amount: { type: Number, required: true },
    },
    trackingUrlToken: { type: String, required: true, unique: true },
    routeHistory: [
      {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

// Geospatial indexes
orderSchema.index({ 'pickupAddress.location': '2dsphere' });
orderSchema.index({ 'deliveryAddress.location': '2dsphere' });

type Order = InferSchemaType<typeof orderSchema>;
export type OrderDocument = HydratedDocument<Order>;

const Order = mongoose.models.Order || model<Order>('Order', orderSchema);
export default Order; // 👈 This line is missing
