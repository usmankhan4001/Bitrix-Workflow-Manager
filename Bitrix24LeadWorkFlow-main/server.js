// server.js
import { connectDB } from './DatabaseHelpers/connectDB.js';
import express from 'express';
import cors from 'cors';
// Note: Local import MUST include the file extension (.js)
// import bitrixRoutes from './routes/bitrixRoutes.js';
// Import the core OAuth functions
import { initB24, handleOAuthRedirect, getAuthorizationUrl } from './Bitrix24AuthUtils/Bitrix24AuthUtils.js'; 
import bitrixroutes from './routes/routes.js';
import { startCronJobs } from './CronJobs/scheduleJob.js';
const app = express();

// --- Server Configuration ---

// Start the cron jobs
startCronJobs();

// conct to the database
await connectDB();

// CORS CONFIGURATION (must come before routes)
app.use(cors({
    origin: [
        "https://inventory.pcirealestate.site",   // your frontend (Hostinger)
        "https://bookingform.pcirealestate.site",
        "http://localhost:3000"                  // optional for local dev
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

// Explicitly handle OPTIONS preflight requests
app.options(/.*/, cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;

// --- B24 Initialization State & Middleware ---

// 1. GLOBAL FLAG: Tracks if initB24 has successfully completed.
let isB24Initialized = false;

// 2. GUARD MIDDLEWARE: Blocks routes that rely on the B24 instance.
const requireB24 = (req, res, next) => {
    if (isB24Initialized) {
        // Proceed to the route handler (e.g., bitrixRoutes)
        next(); 
    } else {
        // Log the blocked request
        console.warn('Webhook received but B24 instance is not ready. Skipping processing.');
        // Return a 200 OK status to prevent Bitrix from retrying the webhook endlessly.
        res.status(200).send({ message: "B24 not initialized, skipping webhook." });
    }
};

// =========================================================================
//                             APPLICATION ROUTES
// =========================================================================

// Root route - Handles Bitrix24 OAuth Redirect & Health Check
// This must be the main entry point for the authorization flow.
app.get('/', async (req, res) => {
    // If no authorization code, treat as a health check
    if (!req.query.code) {
        if (isB24Initialized) {
            return res.send('Bitrix24 Integration Server is Running and Authorized.');
        } else {
             return res.send('Bitrix24 Integration Server is Running but Awaiting Authorization.');
        }
    }

    // --- OAUTH CALLBACK LOGIC ---
    const code = req.query.code;
    
    // 1. Check for immediate error from Bitrix24
    if (req.query.error || req.query.error_description) {
        const error = req.query.error_description || req.query.error || 'Unknown error during authorization.';
        console.error(`Bitrix Error on Redirect: ${error}`);
        return res.status(400).send(`Authorization failed (Bitrix error): ${error}`); 
    }

    // 3. SUCCESS PATH: Exchange code for tokens
    try {
        console.log('Received authorization code. Exchanging for tokens...');
        
        // Exchange code for tokens and save them
        await handleOAuthRedirect(code); 
        
        console.log('App authorized! Tokens saved. Restarting service to load tokens...');
        
        // FIX 1: Send the response FIRST.
        res.send('App authorized! Tokens saved. You may close this window. Service is restarting...');

        // FIX 2: Use setImmediate to delay the process exit, ensuring 
        // Express flushes the HTTP response completely.
        setImmediate(() => {
            process.exit(0);
        });
        
        return; 

    } catch (err) {
        // Log the actual error that triggered the jump to catch
        console.error('Authorization Flow Failed during token exchange:', err.message);
        
        // FIX 3: Ensure we return the 500 status.
        return res.status(500).send('Authorization failed during token exchange.');
    }
});


// Dedicated route for Bitrix Workflow/Webhook calls
// APPLY MIDDLEWARE: Apply the guard to your Bitrix API route
app.use('/bitrixworkflow', requireB24, bitrixroutes);

// =========================================================================
//                             SERVER START
// =========================================================================

app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Check for tokens and print the URL if missing.
    try {
        const b24Instance = await initB24(); 
        if (!b24Instance) {
            console.log(`Open this URL to authorize the app: ${getAuthorizationUrl()}`);
            // isB24Initialized remains false, protecting workflow routes
        } else {

            console.log('Bitrix24 instance initialized/loaded.');
            // 4. SET FLAG: Set to true only on successful initialization
            isB24Initialized = true; 
        }
    } catch (error) {
        console.error('Failed to initialize B24:', error.message);
    }
});