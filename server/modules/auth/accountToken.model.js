import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const accountTokenSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  purpose: { type: String, enum: ['activation', 'password_reset'], required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: { type: Date, default: null }
}, { timestamps: true });

const AccountToken = models.AccountToken || model('AccountToken', accountTokenSchema);
export default AccountToken;
