import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const tripSchema = new Schema(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true
    },
    vanId: {
      type: Schema.Types.ObjectId,
      ref: 'Van',
      required: true
    },
    driverId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      required: true,
      default: 'active',
      index: true
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    endedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

tripSchema.index({ schoolId: 1, vanId: 1, status: 1 });
tripSchema.index({ schoolId: 1, driverId: 1, status: 1 });

// At most one active trip per van.
tripSchema.index(
  { vanId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

// At most one active trip per driver.
tripSchema.index(
  { driverId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'active' }
  }
);

export const Trip = models.Trip || model('Trip', tripSchema);
