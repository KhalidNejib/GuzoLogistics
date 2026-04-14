import { Schema, model, models, InferSchemaType, HydratedDocument, Types } from 'mongoose';

const riderProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    vehicleType: {
      type: String,
      enum: ['MOTORCYCLE', 'BICYCLE', 'VAN'],
      required: true,
    },
    licensePlate: { type: String, required: true },
    isAvailable: { type: Boolean, default: false },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
    },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
);

// Geospatial Index for tracking
riderProfileSchema.index({ currentLocation: '2dsphere' });

type RiderProfile = InferSchemaType<typeof riderProfileSchema>;
export type RiderProfileDocument = HydratedDocument<RiderProfile>;

const RiderProfile = models.RiderProfile || model<RiderProfile>('RiderProfile', riderProfileSchema);
export default RiderProfile;
