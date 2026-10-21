import mongoose from 'mongoose';

const tripSchema = new mongoose.Schema({
  vanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Van', required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['active', 'completed', 'cancelled'], required: true, default: 'active', index: true },
  startedAt: { type: Date, required: true, default: Date.now },
  endedAt: { type: Date, default: null }
}, { timestamps: true });

tripSchema.index({ vanId: 1, status: 1 });
export const Trip = mongoose.model('Trip', tripSchema);
