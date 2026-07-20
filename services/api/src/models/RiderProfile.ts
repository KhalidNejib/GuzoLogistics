import mongoose, { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const riderProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    merchant: { type: Schema.Types.ObjectId, ref: 'User', index: true }, // The company this pilot belongs to
    
    // 🏍️ Vehicle Intelligence
    vehicleType: {
      type: String,
      enum: ['MOTORCYCLE', 'BICYCLE', 'VAN'],
      required: true,
    },
    vehicleMake: { type: String, default: '' },
    vehicleModel: { type: String, default: '' },
    vehicleYear: { type: Number, default: new Date().getFullYear() },
    vehicleColor: { type: String, default: '' },
    licensePlate: { type: String, required: true },

    // 🪪 Compliance Metrics
    profilePhotoUrl: { type: String, default: null }, // Pilot Portrait (Selfie)
    licenseNumber: { type: String, default: '' },
    licensePhotoUrl: { type: String, default: null }, // URL to S3/Cloudinary/Local storage
    idPhotoUrl: { type: String, default: null },      // Fayda / National ID
    faydaIdPhotoUrl: { type: String, default: null }, // Alias/Dedicated Fayda path
    vehiclePhotoUrl: { type: String, default: null }, // Mandatory vehicle proof
    
    // 🆘 Emergency Node
    emergencyContact: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },

    // 🛡️ Operational Status
    onboardingStatus: {
      type: String,
      enum: ['PENDING_DATA', 'IN_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING_DATA',
    },
    rejectionReason: { type: String, default: null },
    isAvailable: { type: Boolean, default: false },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
);

// NOTE: this schema previously had a `currentLocation` GeoJSON field with a
// 2dsphere index, signaling it was meant for geo queries like "find nearby
// riders". It was removed: nothing in the codebase ever ran a $near query
// against it, and the only write to it (rider-onboarding, in userRoutes.ts)
// set it once to a hardcoded Addis Ababa point and never updated it again —
// so every rider was permanently stacked at the same coordinates. Real-time
// rider position lives in Redis (`rider_location:*`, written on every
// location update) instead. If a future feature needs geospatial "nearby
// riders" queries against MongoDB, add this field back and wire it up to
// that live Redis stream on a periodic sync (see syncRouteHistory.ts for
// the existing job pattern) rather than reintroducing a field nothing keeps
// current.

type RiderProfile = InferSchemaType<typeof riderProfileSchema>;
export type RiderProfileDocument = HydratedDocument<RiderProfile>;

const RiderProfile = mongoose.models.RiderProfile || model<RiderProfile>('RiderProfile', riderProfileSchema);
export default RiderProfile;
