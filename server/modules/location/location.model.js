import mongoose from 'mongoose';

const locationUpdateSchema = new mongoose.Schema({
  vanId: { type: mongoose.Schema.Types.ObjectId, ref: 'Van', required: true, index: true },
  tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  latitude: { type: Number, required: true, min: -90, max: 90 },
  longitude: { type: Number, required: true, min: -180, max: 180 },
  recordedAt: { type: Date, required: true },
  receivedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

locationUpdateSchema.index({ tripId: 1, receivedAt: -1 });
export const LocationUpdate = mongoose.model('LocationUpdate', locationUpdateSchema);
