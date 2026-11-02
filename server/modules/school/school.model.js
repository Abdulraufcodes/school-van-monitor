import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const pickupAlertSettingsSchema = new Schema({
  enabled: { type: Boolean, default: true },
  radiusMeters: { type: Number, min: 100, max: 5000, default: 500 },
  minimumApproachMeters: { type: Number, min: 10, max: 1000, default: 25 },
  maxLocationAgeSeconds: { type: Number, min: 15, max: 3600, default: 60 }
}, { _id: false });

const schoolSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 150,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },

    pickupAlertSettings: { type: pickupAlertSettingsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
  }
);

const School = models.School || model("School", schoolSchema);

export default School;
