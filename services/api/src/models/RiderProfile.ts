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
    
    // 📍 Real-time Telemetry
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    rating: { type: Number, default: 5 },
  },
  { timestamps: true }
);

// Geospatial Index for tracking
riderProfileSchema.index({ currentLocation: '2dsphere' });

type RiderProfile = InferSchemaType<typeof riderProfileSchema>;
export type RiderProfileDocument = HydratedDocument<RiderProfile>;

const RiderProfile = mongoose.models.RiderProfile || model<RiderProfile>('RiderProfile', riderProfileSchema);
export default RiderProfile;
