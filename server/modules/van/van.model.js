import mongoose from 'mongoose';

const vanSchema = new mongoose.Schema({
  registrationNumber: { type: String, required: true, unique: true, trim: true, uppercase: true },
  assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export const Van = mongoose.model('Van', vanSchema);
