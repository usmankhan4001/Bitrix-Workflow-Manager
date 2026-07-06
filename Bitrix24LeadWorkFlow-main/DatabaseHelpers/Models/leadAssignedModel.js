// file: DatabaseHelpers/leadAssignedModel.js
import mongoose from 'mongoose';

const assignedLeadSchema = new mongoose.Schema({
  leadId: {
    type: String,
    required: true,
    unique: true
  },
  movedAt: { // Optional: track exactly when you moved it
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Explicitly pointing to the collection 'LeadsThatHaveBeenAssigned'
const AssignedLead = mongoose.model('AssignedLead', assignedLeadSchema, 'LeadsThatHaveBeenAssigned');

export default AssignedLead;