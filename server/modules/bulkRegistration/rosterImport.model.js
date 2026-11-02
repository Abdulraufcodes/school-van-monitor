import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['parent', 'driver'], required: true },
  status: { type: String, enum: ['pending', 'sent', 'failed', 'not_needed'], default: 'pending', required: true },
  sentAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null }
}, { _id: false });

const rosterImportSchema = new mongoose.Schema({
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
  importedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  created: {
    parents: { type: Number, required: true }, drivers: { type: Number, required: true },
    students: { type: Number, required: true }, vans: { type: Number, required: true }
  },
  invitations: { type: [invitationSchema], default: [] }
}, { timestamps: true });

const RosterImport = mongoose.models.RosterImport || mongoose.model('RosterImport', rosterImportSchema);
export default RosterImport;
