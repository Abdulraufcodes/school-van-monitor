import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const notificationSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  tripId: { type: Schema.Types.ObjectId, ref: 'Trip', required: true },
  vanId: { type: Schema.Types.ObjectId, ref: 'Van', required: true },
  type: { type: String, enum: ['pickup_approaching'], required: true },
  distanceMeters: { type: Number, required: true, min: 0 },
  occurredAt: { type: Date, required: true, default: Date.now },
  readAt: { type: Date, default: null }
}, { timestamps: true });

notificationSchema.index({ parentId: 1, occurredAt: -1 });
notificationSchema.index({ tripId: 1, studentId: 1, parentId: 1, type: 1 }, { unique: true });

export default models.Notification || model('Notification', notificationSchema);
