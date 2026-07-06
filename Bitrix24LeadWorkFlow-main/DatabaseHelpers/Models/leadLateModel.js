import mongoose from 'mongoose';

const leadSchema = new mongoose.Schema({
  leadId: {
    type: String,   // or Number, depending on your ID format
    required: true, // ensure every document has a leadId
    unique: true    // optional: prevent duplicate lead IDs
  }
}, {
  timestamps: true // optional: adds createdAt and updatedAt automatically
});

const Lead = mongoose.model('Lead', leadSchema, 'LeadsToBeAssigned');

export default Lead;
