import mongoose, { Schema, model } from 'mongoose';

const transactionSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    type: {
      type: String,
      enum: ['REVENUE', 'PAYOUT', 'COMMISSION', 'CASH_COLLECTED', 'SETTLEMENT'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING',
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'DIGITAL', 'BANK_TRANSFER', 'WALLET', 'TELEBIRR'],
    },
    description: {
      type: String,
    },
    proofImageUrl: {
      type: String,
    },
    referenceId: {
      type: String, // Bank reference, Transaction ID, etc.
    },
    // True while this referenceId is "live" (PENDING/PROCESSING/COMPLETED).
    // Set to false when a settlement is rejected (FAILED), which frees the
    // referenceId up for a legitimate resubmission of the same real bank
    // transaction. Paired with the partial index below, this is what
    // actually prevents two PENDING settlements from using the same
    // referenceId at once — the findOne pre-check in the controller is
    // just a fast, friendly error message and isn't atomic on its own.
    referenceActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

transactionSchema.index({ user: 1, createdAt: -1 });

transactionSchema.index(
  { referenceId: 1 },
  { unique: true, partialFilterExpression: { referenceId: { $exists: true }, referenceActive: true } }
);

const Transaction = mongoose.models.Transaction || model('Transaction', transactionSchema);

export default Transaction;
