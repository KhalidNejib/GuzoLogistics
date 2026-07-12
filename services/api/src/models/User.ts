import mongoose, { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const userSchema = new Schema(
  {
    clerkId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['MERCHANT', 'RIDER', 'ADMIN'],
      // RIDER is the least-privileged role and matches the default every
      // User-creation call site in this codebase already assumes (see
      // clerkWebhook.ts, auth.ts, socket.ts) — this schema-level default
      // previously said MERCHANT, which every one of those call sites
      // explicitly overrides today, but would silently hand out MERCHANT
      // privileges to any future insert that forgets to set role.
      default: 'RIDER',
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    businessName: {
      type: String,
    },
    fleetKey: {
      type: String,
      unique: true,
      sparse: true, // Only for merchants
      index: true,
    },
    businessAddress: {
      type: String,
    },
    supportEmail: {
      type: String,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    // Soft-delete: set when the Clerk account is deleted.
    // We NEVER hard-delete Users so order history is always preserved.
    deletedAt: {
      type: Date,
      default: null,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    expoPushToken: {
      type: String,
      default: null,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    logoUrl: {
      type: String,
      default: null,
    },
    serviceCity: {
      type: String,
      default: null,
    },
    deliveryPricing: {
      baseFare: { type: Number, default: 50 },
      perKmRate: { type: Number, default: 10 },
      currency: { type: String, default: 'ETB' },
    },
    notificationSettings: {
      emailAlerts: { type: Boolean, default: true },
      pushAlerts: { type: Boolean, default: true },
      orderUpdates: { type: Boolean, default: true },
      financeAlerts: { type: Boolean, default: true },
    },
    preferences: {
      darkMode: { type: Boolean, default: false },
      language: { type: String, default: 'EN' },
    },
    finance: {
      totalRevenue: { type: Number, default: 0 },
      balance: { type: Number, default: 0 },
      codBalance: { type: Number, default: 0 }, // Collective cash held by all riders for this merchant
      cashHeld: { type: Number, default: 0 },    // For RIDERS: Cash currently in their pocket
      totalEarned: { type: Number, default: 0 }, // Lifetime earnings tracking
    },
    // No business meaning on its own — written inside a transaction during
    // order acceptance purely to give MongoDB something to write-conflict on,
    // which serializes concurrent accept attempts by the same rider. See
    // acceptOrder() in orderController.ts for why this exists.
    lastAcceptAttemptAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ onboardingCompleted: 1 });
userSchema.index({ role: 1, onboardingCompleted: 1 }); // For merchant fleet lists (riders needing review)

type User = InferSchemaType<typeof userSchema>;
export type UserDocument = HydratedDocument<User>;

const User = mongoose.models.User || model<User>('User', userSchema);

export default User;
