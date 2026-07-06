import mongoose from 'mongoose';
import Lead from './Models/leadLateModel.js'

const MONGO_DB_URI = process.env.LATE_LEAD_DATABASE_URI;

export default async function storeLateLeadInDatabase(leadData) {

    console.log('Storing late lead in database...', MONGO_DB_URI);

    if (!leadData) {
        console.log('No lead data provided. Skipping database operation.');
        return null;
    }

    try {
        // if (mongoose.connection.readyState !== 1) {
        //     console.log('Attempting to connect to MongoDB...');
        //     await mongoose.connect(MONGO_DB_URI);
        //     console.log('Successfully connected to MongoDB.');
        // } else {
        //     console.log('Already connected to MongoDB.');
        // }

        // Create a new instance of the model with the single lead data
        const newLead = new Lead(leadData);
        
        // Save the single document
        const savedLead = await newLead.save();
        
        console.log(`Successfully inserted lead with ID: ${savedLead._id}`);

        return savedLead;

    } catch (error) {
        console.error('ERROR storing late lead:', error);
        throw new Error('Failed to complete database operation.');
    }
}