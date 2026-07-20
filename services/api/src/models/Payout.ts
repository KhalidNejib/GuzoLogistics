import mongoose, { Schema, model, InferSchemaType, HydratedDocument } from 'mongoose';

const payoutSchema = new Schema(
  {
    merchant: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    referenceId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'PAID', 'REJECTED'],
      default: 'PENDING',
    },
    method: {
      type: String,
      default: 'Bank Transfer',
    },
    bankDetails: {
        bankName: String,
        accountNumber: String,
        accountName: String,
    },
    processedAt: {
      type: Date,
    },
    notes: String,
  },
  { timestamps: true }
);

payoutSchema.index(
  { referenceId: 1 },
  { unique: true, partialFilterExpression: { referenceId: { $exists: true } } }
);

type Payout = InferSchemaType<typeof payoutSchema>;
export type PayoutDocument = HydratedDocument<Payout>;

const Payout = mongoose.models.Payout || model<Payout>('Payout', payoutSchema);
export default Payout;
