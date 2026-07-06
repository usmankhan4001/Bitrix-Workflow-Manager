// file: cronScheduler.js
import cron from 'node-cron';
import { assignLateLeads } from './assignLateLeads.js'; // <--- Update this path

export const startCronJobs = () => {
    
    cron.schedule('0 10 * * 1-6', async () => {
        console.log('⏳ CRON START: Checking for late leads...');
        
        try {
            await assignLateLeads();
        } catch (error) {
            console.error('❌ CRON ERROR: Failed to run assignment logic', error);
        }
        
        console.log('✅ CRON END: Check complete.');
    }, {
        scheduled: true,
        timezone: "Asia/Karachi" // Ensure this matches your local time preference
    });

    console.log('Daemon: Cron jobs initialized.');
};