import { Schema, model, models, InferSchemaType, HydratedDocument } from 'mongoose';

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
      default: 'MERCHANT',
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
    phoneNumber: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

type User = InferSchemaType<typeof userSchema>;
// Modern export for document instances
export type UserDocument = HydratedDocument<User>;

const User = models.User || model<User>('User', userSchema);
export default User;
