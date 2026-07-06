// file: DatabaseHelpers/moveLeadToAssigned.js
import Lead from './Models/leadLateModel.js';
import AssignedLead from './Models/leadAssignedModel.js'; 

export const moveLeadToAssigned = async (leadId) => {
    try {
        console.log(`Archiving lead ${leadId}...`);

        // 1. Find the original document
        const originalLead = await Lead.findOne({ leadId: leadId });

        if (!originalLead) {
            console.error(`Lead ${leadId} not found in source collection. Cannot move.`);
            return;
        }

        // 2. Save it to the new collection
        const archivedLead = new AssignedLead({
            leadId: originalLead.leadId
        });
        await archivedLead.save();

        // 3. Delete it from the old collection
        await Lead.deleteOne({ leadId: leadId });

        console.log(`Success: Lead ${leadId} moved to 'LeadsThatHaveBeenAssigned'.`);

    } catch (error) {
        // Handle duplicate key error (if lead was already archived)
        if (error.code === 11000) {
            console.warn(`Lead ${leadId} already exists in archive. Deleting from source...`);
            await Lead.deleteOne({ leadId: leadId });
        } else {
            console.error(`Error moving lead ${leadId}:`, error);
            throw error; 
        }
    }
};