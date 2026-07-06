import mongoose from 'mongoose';
import Lead from './Models/leadLateModel.js';

export const getAllTheLateLeads = async () => {
    try {
        // 1. Fetch data
        const lateLeads = await Lead.find({});

        // 2. Extract ONLY the leadId from each object
        // This turns [{ leadId: "5503", ... }, { leadId: "5504", ... }] 
        // into ["5503", "5504"]
        const justIds = lateLeads.map(lead => lead.leadId);
        
        console.log("List of IDs:", justIds);

        return justIds; 
    }
    catch (error) {
        console.error("Error fetching late leads:", error);
        throw error;
    }
}