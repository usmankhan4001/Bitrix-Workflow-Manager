// file: DatabaseHelpers/dbConnect.js
import mongoose from 'mongoose';

const MONGO_DB_URI = process.env.LATE_LEAD_DATABASE_URI;

export const connectDB = async () => {
    try {
        // Check if we are already connected to avoid double-connecting
        if (mongoose.connection.readyState === 1) {
            console.log('MongoDB is already connected.');
            return;
        }

        console.log('Connecting to MongoDB...');

        // CLEAN VERSION: Uses the URI exactly as it is in your .env file
        const conn = await mongoose.connect(MONGO_DB_URI, {
            serverSelectionTimeoutMS: 5000, 
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Stop the app if DB fails
    }
};