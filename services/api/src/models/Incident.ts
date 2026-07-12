import mongoose, { Document, Schema } from 'mongoose';

export interface IIncident extends Document {
  rider: mongoose.Types.ObjectId;
  type: string;
  description: string;
  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

const incidentSchema = new Schema<IIncident>(
  {
    rider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['SOS', 'Traffic Accident', 'Merchant Dispute', 'App Malfunction', 'Other'],
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number],
      },
    },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'],
      default: 'OPEN',
    },
  },
  {
    timestamps: true,
  }
);

incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ rider: 1 });
incidentSchema.index({ status: 1 });

const Incident = mongoose.model<IIncident>('Incident', incidentSchema);

export default Incident;
